// End-to-end API regression test for PayPilot.
// Exercises the full auth lifecycle, bill CRUD, category-specific fields, payments
// (bank + card), scheduling, reminders, track-payments, cross-user security and
// attachment validation against a running server.
//
// Usage:
//   npm start                 (in one terminal)
//   npm test                  (in another)
//
// Safe to re-run against a non-empty database: the test user is created with a
// unique id/email each run, so it never collides with previous runs. It does not
// touch or depend on any other user's data.

const BASE = process.env.PAYPILOT_BASE_URL || 'http://localhost:3000/api';
const RUN_ID = Date.now();
const TEST_USER = `tester_${RUN_ID}`;
const TEST_EMAIL = `tester_${RUN_ID}@example.com`;

let pass = 0;
let fail = 0;
const failures = [];

function check(label, cond, extra) {
  if (cond) {
    pass += 1;
  } else {
    fail += 1;
    failures.push(label);
    console.log(`FAIL: ${label}`, extra !== undefined ? JSON.stringify(extra) : '');
  }
}

async function req(path, { method = 'GET', body, token, isForm } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  let data = {};
  try { data = await res.json(); } catch (err) { /* non-JSON response */ }
  return { status: res.status, data };
}

// Solves the screen-verification captcha exactly as a real user would: using only
// the target emoji and grid returned in the HTTP response (never server internals).
async function solveCaptcha(userId) {
  const ch = await req('/auth/screen-challenge', { method: 'POST', body: { userId } });
  if (ch.status !== 200) return ch;
  const { target, grid } = ch.data;
  const answer = grid.filter((c) => c.emoji === target).map((c) => c.id);
  return req('/auth/verify-screen', { method: 'POST', body: { userId, answer } });
}

async function fullLogin(userId, password) {
  const vs = await solveCaptcha(userId);
  if (vs.status !== 200) return vs;
  const otp = vs.data.devOtp;
  const vo = await req('/auth/verify-otp', { method: 'POST', body: { userId, otp } });
  if (vo.status !== 200) return vo;
  return req('/auth/login', { method: 'POST', body: { userId, password } });
}

function minimalPdfBuffer() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n' +
    'startxref\n0\n%%EOF'
  );
}

(async () => {
  // ---------------- AUTH ----------------
  console.log('=== AUTH ===');
  const signup1 = await req('/auth/signup', { method: 'POST', body: {
    email: TEST_EMAIL, userId: TEST_USER, password: 'Tester@123', confirmPassword: 'Tester@123',
    panDetails: 'ABCDE1234F', bankAccountNumber: '998877', ifscCode: 'SBI0001', bankingPartner: 'SBI',
  }});
  check('signup success', signup1.status === 201 && signup1.data.ok === true, signup1.data);

  const signupDup = await req('/auth/signup', { method: 'POST', body: {
    email: TEST_EMAIL, userId: TEST_USER, password: 'Tester@123', confirmPassword: 'Tester@123',
  }});
  check('duplicate signup rejected (409)', signupDup.status === 409);

  const signupMismatch = await req('/auth/signup', { method: 'POST', body: {
    email: `mismatch_${RUN_ID}@example.com`, userId: `mismatch_${RUN_ID}`, password: 'A', confirmPassword: 'B',
  }});
  check('mismatched password signup rejected (400)', signupMismatch.status === 400);

  const signupMissing = await req('/auth/signup', { method: 'POST', body: { email: 'x@example.com' } });
  check('missing fields signup rejected (400)', signupMissing.status === 400);

  const loginNoVerify = await req('/auth/login', { method: 'POST', body: { userId: TEST_USER, password: 'Tester@123' } });
  check('login blocked while pending, even without verification (403)', loginNoVerify.status === 403, loginNoVerify.data);

  const loginPending = await fullLogin(TEST_USER, 'Tester@123');
  check('login blocked while pending even after verification (403)', loginPending.status === 403, loginPending.data);

  const adminLogin = await fullLogin('admin', 'Admin@123');
  const adminT = adminLogin.data.token;
  check('admin login succeeds', !!adminT, adminLogin.data);
  check('admin user has is_admin:true (exact JSON key)', adminLogin.data.user.is_admin === true, adminLogin.data.user);

  const pendingList = await req('/auth/admin/pending-users', { token: adminT });
  check('pending list contains the test user', pendingList.data.users.some((u) => u.user_id === TEST_USER), pendingList.data);

  const approve = await req(`/auth/admin/approve/${TEST_USER}`, { method: 'POST', token: adminT });
  check('approve succeeds', approve.status === 200);

  const loginAfterApproval = await fullLogin(TEST_USER, 'Tester@123');
  check('login succeeds after approval', loginAfterApproval.status === 200 && !!loginAfterApproval.data.token, loginAfterApproval.data);

  const wrongAnswer = await req('/auth/verify-screen', { method: 'POST', body: { userId: TEST_USER, answer: [999] } });
  check('wrong captcha answer rejected (400)', wrongAnswer.status === 400);

  let lockStatus;
  for (let i = 0; i < 3; i += 1) {
    lockStatus = await fullLogin(TEST_USER, 'WrongPass!');
  }
  check('account locked after 3 failed attempts (423)', lockStatus.status === 423, lockStatus.data);

  const challengeWhileLocked = await req('/auth/screen-challenge', { method: 'POST', body: { userId: TEST_USER } });
  check('challenge blocked while locked (423)', challengeWhileLocked.status === 423);

  const forgotReq = await req('/auth/forgot/request', { method: 'POST', body: { userId: TEST_USER, email: TEST_EMAIL } });
  check('forgot-password request succeeds', forgotReq.status === 200 && !!forgotReq.data.devOtp, forgotReq.data);
  const forgotVerify = await req('/auth/forgot/verify', { method: 'POST', body: { userId: TEST_USER, otp: forgotReq.data.devOtp } });
  check('forgot-password otp verify succeeds', forgotVerify.status === 200);
  const forgotReset = await req('/auth/forgot/reset', { method: 'POST', body: { userId: TEST_USER, newPassword: 'Tester@999', confirmPassword: 'Tester@999' } });
  check('password reset succeeds', forgotReset.status === 200, forgotReset.data);

  const loginAfterReset = await fullLogin(TEST_USER, 'Tester@999');
  check('login succeeds with new password after unlock', loginAfterReset.status === 200 && !!loginAfterReset.data.token, loginAfterReset.data);
  const userToken = loginAfterReset.data.token;

  const noToken = await req('/bills/overview?category=All');
  check('no-token request rejected (401)', noToken.status === 401);
  const badToken = await req('/bills/overview?category=All', { token: 'garbage.invalid.token' });
  check('bad-token request rejected (401)', badToken.status === 401);

  // ---------------- BILLS ----------------
  console.log('=== BILLS ===');
  const genericBillForm = new FormData();
  genericBillForm.append('billName', 'Internet - Nov');
  genericBillForm.append('billCategory', 'Internet Charges');
  genericBillForm.append('dueDate', '2026-11-10');
  genericBillForm.append('amount', '1200');
  genericBillForm.append('isRecurring', 'false');
  const addGeneric = await req('/bills', { method: 'POST', body: genericBillForm, isForm: true, token: userToken });
  check('add generic bill succeeds', addGeneric.status === 201, addGeneric.data);
  const genericBillId = addGeneric.data.bills[0].bill_id;

  const debtForm = new FormData();
  debtForm.append('billName', 'Car Loan');
  debtForm.append('billCategory', 'Debt Payments');
  debtForm.append('dueDate', '2026-11-05');
  debtForm.append('amount', '12500');
  debtForm.append('isRecurring', 'false');
  debtForm.append('loanType', 'Car Loan');
  debtForm.append('totalLoanAmount', '500000');
  const addDebt = await req('/bills', { method: 'POST', body: debtForm, isForm: true, token: userToken });
  check('add debt bill succeeds', addDebt.status === 201, addDebt.data);
  const debtBill = addDebt.data.bills[0];
  check('debt bill has loan_type', debtBill.loan_type === 'Car Loan', debtBill);
  check('debt bill has total_loan_amount', debtBill.total_loan_amount === 500000, debtBill);

  const rentForm = new FormData();
  rentForm.append('billName', 'House Rent - Aug');
  rentForm.append('billCategory', 'House Rent');
  rentForm.append('dueDate', '2026-09-02');
  rentForm.append('amount', '15000');
  rentForm.append('isRecurring', 'false');
  rentForm.append('periodFrom', '2026-08-01');
  rentForm.append('periodTo', '2026-08-31');
  const addRent = await req('/bills', { method: 'POST', body: rentForm, isForm: true, token: userToken });
  check('add rent bill succeeds', addRent.status === 201, addRent.data);
  const rentBill = addRent.data.bills[0];
  check('rent bill has period_from/to', rentBill.period_from === '2026-08-01' && rentBill.period_to === '2026-08-31', rentBill);

  const recurringForm = new FormData();
  recurringForm.append('billName', 'Netflix Sub');
  recurringForm.append('billCategory', 'Cell phone charges');
  recurringForm.append('dueDate', '2026-11-20');
  recurringForm.append('amount', '500');
  recurringForm.append('isRecurring', 'true');
  const addRecurring = await req('/bills', { method: 'POST', body: recurringForm, isForm: true, token: userToken });
  check('recurring bill creates 3 occurrences', addRecurring.data.bills.length === 3, addRecurring.data.bills.map((b) => b.due_date));
  check('recurring bill has is_recurring:true (exact JSON key)', addRecurring.data.bills[0].is_recurring === true, addRecurring.data.bills[0]);

  const invalidCategoryForm = new FormData();
  invalidCategoryForm.append('billName', 'Bad Cat');
  invalidCategoryForm.append('billCategory', 'Not A Real Category');
  invalidCategoryForm.append('dueDate', '2026-11-20');
  invalidCategoryForm.append('amount', '500');
  const addInvalidCat = await req('/bills', { method: 'POST', body: invalidCategoryForm, isForm: true, token: userToken });
  check('invalid category rejected (400)', addInvalidCat.status === 400, addInvalidCat.data);

  const missingFieldsForm = new FormData();
  missingFieldsForm.append('billName', 'No amount');
  const addMissing = await req('/bills', { method: 'POST', body: missingFieldsForm, isForm: true, token: userToken });
  check('missing required fields rejected (400)', addMissing.status === 400);

  const editResult = await req(`/bills/${genericBillId}`, { method: 'PUT', token: userToken, body: {
    billName: 'Internet - Nov (Updated)', billCategory: 'Internet Charges', dueDate: '2026-11-10', amount: 1350,
  }});
  check('edit bill succeeds', editResult.status === 200 && editResult.data.bill.bill_name === 'Internet - Nov (Updated)', editResult.data);

  const deleteResult = await req(`/bills/${genericBillId}`, { method: 'DELETE', token: userToken });
  check('delete bill succeeds', deleteResult.status === 200);
  const deleteAgain = await req(`/bills/${genericBillId}`, { method: 'DELETE', token: userToken });
  check('deleting already-deleted bill returns 404', deleteAgain.status === 404);

  // ---------------- BILLS OVERVIEW ----------------
  console.log('=== BILLS OVERVIEW ===');
  const overview = await req('/bills/overview?category=All', { token: userToken });
  check('overview lists remaining bills (5: debt, rent, 3 recurring)', overview.data.bills.length === 5, overview.data.bills.length);
  const debtOverview = await req('/bills/overview?category=Debt Payments', { token: userToken });
  check('debt category filter works', debtOverview.data.bills.length === 1 && debtOverview.data.bills[0].loan_type === 'Car Loan');
  const statusFilter = await req('/bills/overview?category=All&status=Not Paid', { token: userToken });
  check('status filter works', statusFilter.data.bills.every((b) => b.payment_status === 'Not Paid'));
  // Regression: the real manage-bills.js filter form submits fromDate/toDate/status
  // as present-but-empty params (not omitted) whenever those filters are left blank.
  // A plain String @RequestParam doesn't get Spring's "" -> null treatment the way a
  // LocalDate param does, so this previously made every bill vanish from the list
  // (while the category counts, a separate query, still showed them).
  const blankFilters = await req('/bills/overview?category=All&fromDate=&toDate=&status=', { token: userToken });
  check('blank (but present) fromDate/toDate/status filters do not hide bills', blankFilters.data.bills.length === 5, blankFilters.data.bills.length);

  // ---------------- UPCOMING/OVERDUE + PAY NOW ----------------
  console.log('=== UPCOMING/OVERDUE + PAY NOW ===');
  const overdue1 = await req('/bills/upcoming-overdue?category=Debt Payments', { token: userToken });
  check('overdue amount_due equals full amount before any payment', overdue1.data.bills[0].amount_due === 12500, overdue1.data.bills[0]);
  check('overdue days computed for past due date', overdue1.data.bills[0].overdue_days > 0, overdue1.data.bills[0]);

  const partialPay = await req(`/bills/${debtBill.bill_id}/pay-now`, { method: 'POST', token: userToken, body: { amount: 5000, paymentMode: 'Net Banking', paymentInstitution: 'HDFC Bank' } });
  check('partial payment succeeds, status Partially Paid', partialPay.status === 200 && partialPay.data.bill.payment_status === 'Partially Paid', partialPay.data);

  const overdue2 = await req('/bills/upcoming-overdue?category=Debt Payments', { token: userToken });
  check('amount_due reflects partial payment (7500 remaining)', overdue2.data.bills[0].amount_due === 7500, overdue2.data.bills[0]);

  const overpayAttempt = await req(`/bills/${debtBill.bill_id}/pay-now`, { method: 'POST', token: userToken, body: { amount: 9000, paymentMode: 'Net Banking' } });
  check('overpayment beyond balance rejected (400)', overpayAttempt.status === 400, overpayAttempt.data);

  const finalPay = await req(`/bills/${debtBill.bill_id}/pay-now`, { method: 'POST', token: userToken, body: { amount: 7500, paymentMode: 'Credit Card', cardHolderName: 'Test User', cardLast4: '4321' } });
  check('final payment completes bill as Paid', finalPay.status === 200 && finalPay.data.bill.payment_status === 'Paid', finalPay.data);

  const payAgainAfterPaid = await req(`/bills/${debtBill.bill_id}/pay-now`, { method: 'POST', token: userToken, body: { amount: 1, paymentMode: 'Net Banking' } });
  check('paying an already-fully-paid bill rejected (400)', payAgainAfterPaid.status === 400, payAgainAfterPaid.data);

  const payInvalidAmount = await req(`/bills/${rentBill.bill_id}/pay-now`, { method: 'POST', token: userToken, body: { amount: 0, paymentMode: 'Net Banking' } });
  check('pay-now with zero amount rejected (400)', payInvalidAmount.status === 400);

  // ---------------- SNOOZE / MARK PAID ----------------
  console.log('=== SNOOZE / MARK PAID ===');
  const snoozeResult = await req(`/bills/${rentBill.bill_id}/snooze`, { method: 'POST', token: userToken, body: { untilDate: '2026-09-15' } });
  check('snooze succeeds', snoozeResult.status === 200 && snoozeResult.data.bill.snoozed_until === '2026-09-15', snoozeResult.data);

  const markPaidResult = await req(`/bills/${rentBill.bill_id}/mark-paid`, { method: 'POST', token: userToken, body: {} });
  check('mark-paid succeeds', markPaidResult.status === 200 && markPaidResult.data.bill.payment_status === 'Paid', markPaidResult.data);

  // ---------------- REMINDER SETTINGS ----------------
  console.log('=== REMINDER SETTINGS ===');
  const recurringBills = await req('/bills/overview?category=Cell phone charges', { token: userToken });
  const netflixBillId = recurringBills.data.bills[0].bill_id;
  const setReminder = await req(`/reminders/${netflixBillId}`, { method: 'PUT', token: userToken, body: {
    reminderFrequency: 'Monthly', reminderStartDate: '2026-11-15', customMessage: 'Netflix due', notificationPreference: 'Email', isRecurring: true,
  }});
  check('set reminder succeeds', setReminder.status === 200, setReminder.data);
  const getReminder = await req(`/reminders/${netflixBillId}`, { token: userToken });
  check('reminder round-trips correctly', getReminder.data.reminder.custom_message === 'Netflix due' && getReminder.data.reminder.reminder_frequency === 'Monthly', getReminder.data);
  check('reminder has is_recurring:true (exact JSON key)', getReminder.data.reminder.is_recurring === true, getReminder.data.reminder);

  const reminderOnMissingBill = await req('/reminders/non-existent-id', { token: userToken });
  check('reminder for nonexistent bill returns 404', reminderOnMissingBill.status === 404);

  // ---------------- SCHEDULE PAYMENT ----------------
  console.log('=== SCHEDULE PAYMENT ===');
  const scheduleNonRecurringBadFreq = await req(`/scheduled-payments/bill/${rentBill.bill_id}`, { method: 'POST', token: userToken, body: {
    payeeName: 'Landlord', paymentMode: 'Net Banking', scheduledDate: '2026-09-01', amount: 15000, paymentFrequency: 'Monthly',
  }});
  check('frequency on non-recurring bill rejected (400)', scheduleNonRecurringBadFreq.status === 400, scheduleNonRecurringBadFreq.data);

  const scheduleRecurringGood = await req(`/scheduled-payments/bill/${netflixBillId}`, { method: 'POST', token: userToken, body: {
    payeeName: 'Netflix Inc', paymentMode: 'Credit Card', scheduledDate: '2026-11-18', amount: 500,
    paymentFrequency: 'Monthly', purposeOfPayment: 'Subscription',
  }});
  check('schedule payment with purpose+frequency on recurring bill succeeds', scheduleRecurringGood.status === 201, scheduleRecurringGood.data);
  const scheduledId = scheduleRecurringGood.data.scheduled.scheduled_payment_id;
  check('purpose_of_payment persisted', scheduleRecurringGood.data.scheduled.purpose_of_payment === 'Subscription');
  check('payment_frequency persisted', scheduleRecurringGood.data.scheduled.payment_frequency === 'Monthly');

  const scheduleInvalidMethod = await req(`/scheduled-payments/bill/${netflixBillId}`, { method: 'POST', token: userToken, body: {
    payeeName: 'X', paymentMode: 'Crypto', scheduledDate: '2026-11-18', amount: 500,
  }});
  check('invalid payment method rejected (400)', scheduleInvalidMethod.status === 400);

  const modifyGood = await req(`/scheduled-payments/${scheduledId}/modify`, { method: 'POST', token: userToken, body: { scheduledDate: '2026-11-25' } });
  check('modify scheduled payment succeeds', modifyGood.status === 200 && modifyGood.data.scheduled.scheduled_date === '2026-11-25', modifyGood.data);

  const cancelGood = await req(`/scheduled-payments/${scheduledId}/cancel`, { method: 'POST', token: userToken });
  check('cancel scheduled payment succeeds', cancelGood.status === 200, cancelGood.data);

  const modifyAfterCancel = await req(`/scheduled-payments/${scheduledId}/modify`, { method: 'POST', token: userToken, body: { scheduledDate: '2099-01-01' } });
  check('modify after cancel rejected (400)', modifyAfterCancel.status === 400, modifyAfterCancel.data);

  const cancelAgain = await req(`/scheduled-payments/${scheduledId}/cancel`, { method: 'POST', token: userToken });
  check('cancel already-cancelled rejected (400)', cancelAgain.status === 400, cancelAgain.data);

  // ---------------- TRACK PAYMENTS ----------------
  console.log('=== TRACK PAYMENTS ===');
  const progress = await req('/payments/progress?category=All', { token: userToken });
  const debtProgress = progress.data.bills.find((b) => b.bill_id === debtBill.bill_id);
  check('progress shows 100% green for fully paid debt bill', debtProgress.progress_percent === 100 && debtProgress.progress_color === 'green', debtProgress);

  const payOverview = await req('/payments/overview?category=All', { token: userToken });
  check('payment overview includes paid bills as Paid', payOverview.data.bills.some((b) => b.bill_id === debtBill.bill_id && b.payment_status === 'Paid'), payOverview.data.bills);

  const history = await req('/payments/history?category=All', { token: userToken });
  const debtPayments = history.data.payments.filter((p) => p.bill_id === debtBill.bill_id);
  check('payment history has 2 entries for debt bill (partial+final)', debtPayments.length === 2, debtPayments);
  check('history shows bank institution on net-banking payment', debtPayments.some((p) => p.payment_institution === 'HDFC Bank'), debtPayments);
  check('history shows masked card on card payment', debtPayments.some((p) => p.card_last4 === '4321' && p.card_holder_name === 'Test User'), debtPayments);

  // ---------------- CROSS-USER SECURITY ----------------
  console.log('=== CROSS-USER SECURITY ===');
  const crossDelete = await req(`/bills/${debtBill.bill_id}`, { method: 'DELETE', token: adminT });
  check('admin cannot delete another user\'s bill (404)', crossDelete.status === 404, crossDelete.data);
  const crossPay = await req(`/bills/${rentBill.bill_id}/pay-now`, { method: 'POST', token: adminT, body: { amount: 1, paymentMode: 'Net Banking' } });
  check('admin cannot pay another user\'s bill (404)', crossPay.status === 404, crossPay.data);
  const crossReminder = await req(`/reminders/${netflixBillId}`, { token: adminT });
  check('admin cannot read another user\'s reminder (404)', crossReminder.status === 404, crossReminder.data);
  const crossScheduleCancel = await req(`/scheduled-payments/${scheduledId}/cancel`, { method: 'POST', token: adminT });
  check('admin cannot cancel another user\'s scheduled payment (404)', crossScheduleCancel.status === 404, crossScheduleCancel.data);
  const adminOverview = await req('/bills/overview?category=All', { token: adminT });
  check('admin overview does not include the test user\'s bills', !adminOverview.data.bills.some((b) => b.bill_id === debtBill.bill_id));

  // ---------------- NON-ADMIN BLOCKED FROM ADMIN ROUTES ----------------
  console.log('=== NON-ADMIN ADMIN-ROUTE BLOCK ===');
  const nonAdminPendingList = await req('/auth/admin/pending-users', { token: userToken });
  check('non-admin blocked from pending-users list (403)', nonAdminPendingList.status === 403, nonAdminPendingList.data);
  const nonAdminApprove = await req('/auth/admin/approve/admin', { method: 'POST', token: userToken });
  check('non-admin blocked from approve endpoint (403)', nonAdminApprove.status === 403, nonAdminApprove.data);

  // ---------------- ATTACHMENT VALIDATION ----------------
  console.log('=== ATTACHMENT VALIDATION ===');
  const pdfBuf = minimalPdfBuffer();

  const validForm = new FormData();
  validForm.append('billName', 'With Attachment');
  validForm.append('billCategory', 'Groceries');
  validForm.append('dueDate', '2026-11-20');
  validForm.append('amount', '200');
  validForm.append('isRecurring', 'false');
  validForm.append('attachment', new Blob([pdfBuf], { type: 'application/pdf' }), 'bill.pdf');
  const validUpload = await req('/bills', { method: 'POST', body: validForm, isForm: true, token: userToken });
  check('valid PDF attachment accepted', validUpload.status === 201 && !!validUpload.data.bills[0].attachment, validUpload.data);

  const badTypeForm = new FormData();
  badTypeForm.append('billName', 'Bad Type');
  badTypeForm.append('billCategory', 'Groceries');
  badTypeForm.append('dueDate', '2026-11-20');
  badTypeForm.append('amount', '200');
  badTypeForm.append('attachment', new Blob(['hello'], { type: 'text/plain' }), 'notes.txt');
  const badTypeUpload = await req('/bills', { method: 'POST', body: badTypeForm, isForm: true, token: userToken });
  check('non-PDF attachment rejected (400)', badTypeUpload.status === 400, badTypeUpload.data);

  const bigBuf = Buffer.concat([pdfBuf, Buffer.alloc(3 * 1024 * 1024, 0x41)]);
  const bigForm = new FormData();
  bigForm.append('billName', 'Too Big');
  bigForm.append('billCategory', 'Groceries');
  bigForm.append('dueDate', '2026-11-20');
  bigForm.append('amount', '200');
  bigForm.append('attachment', new Blob([bigBuf], { type: 'application/pdf' }), 'big.pdf');
  const bigUpload = await req('/bills', { method: 'POST', body: bigForm, isForm: true, token: userToken });
  check('oversized attachment rejected (400)', bigUpload.status === 400, bigUpload.data);

  const fileUrl = validUpload.data.bills[0].attachment;
  const fileRes = await fetch(`${BASE.replace(/\/api$/, '')}${fileUrl}`);
  check('uploaded attachment is retrievable', fileRes.status === 200);

  // ---------------- SUMMARY ----------------
  console.log('\n=== SUMMARY ===');
  console.log(`PASS: ${pass}  FAIL: ${fail}`);
  if (failures.length) {
    console.log('Failed checks:');
    failures.forEach((f) => console.log(' -', f));
  }
  process.exit(fail > 0 ? 1 : 0);
})().catch((err) => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
