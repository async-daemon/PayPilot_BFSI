requireAuthOrRedirect();
renderUserChip('welcomeMsg');

let categories = ['All'];
let currentPayBillId = null;
let selectedPayMethod = null;

const CATEGORY_ICONS = {
  'Debt Payments': '💸',
  'House Rent': '🏠',
  Groceries: '🛒',
  'Internet Charges': '📡',
  'Retirement Charges': '🧓',
  'Cell phone charges': '📱',
};

async function loadCategories() {
  const data = await api('/bills/categories');
  categories = data.categories;
  const withAll = categories;
  const withoutAll = categories.filter((c) => c !== 'All');
  ['ovCategory', 'odCategory', 'snCategory', 'rmCategory'].forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = withAll.map((c) => `<option value="${c}">${c}</option>`).join('');
  });
  document.getElementById('billCategory').innerHTML = withoutAll.map((c) => `<option value="${c}">${c}</option>`).join('');
  toggleCategoryFields('billCategory', 'debtFieldsWrap', 'debtFieldsWrap2', 'rentFieldsWrap', 'rentFieldsWrap2', 'billAmountLabel', 'billDueDateLabel');
}

function toggleCategoryFields(categorySelectId, debtWrap1, debtWrap2, rentWrap1, rentWrap2, amountLabelId, dueDateLabelId) {
  const category = document.getElementById(categorySelectId).value;
  const isDebt = category === 'Debt Payments';
  const isRent = category === 'House Rent';
  document.getElementById(debtWrap1).classList.toggle('hidden', !isDebt);
  document.getElementById(debtWrap2).classList.toggle('hidden', !isDebt);
  document.getElementById(rentWrap1).classList.toggle('hidden', !isRent);
  document.getElementById(rentWrap2).classList.toggle('hidden', !isRent);
  if (amountLabelId) document.getElementById(amountLabelId).textContent = isDebt ? 'Monthly EMI' : 'Amount';
  if (dueDateLabelId) document.getElementById(dueDateLabelId).textContent = isDebt ? 'Bill Due Date' : 'Due Date';
}
document.getElementById('billCategory').addEventListener('change', () =>
  toggleCategoryFields('billCategory', 'debtFieldsWrap', 'debtFieldsWrap2', 'rentFieldsWrap', 'rentFieldsWrap2', 'billAmountLabel', 'billDueDateLabel')
);

// ---- Tabs ----
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'overview') loadOverview();
    if (btn.dataset.tab === 'overdue') loadOverdue();
    if (btn.dataset.tab === 'snooze') loadSnooze();
    if (btn.dataset.tab === 'reminder') loadReminderBillOptions();
  });
});

const params = new URLSearchParams(window.location.search);
if (params.get('tab')) {
  const target = document.querySelector(`.tab-btn[data-tab="${params.get('tab')}"]`);
  if (target) target.click();
}

// ---- Add New Bill ----
function resetAddForm() {
  ['billName', 'billAmount', 'billDate', 'billDueDate', 'billNotes', 'billLoanType', 'billTotalLoanAmount', 'billPeriodFrom', 'billPeriodTo'].forEach(
    (id) => (document.getElementById(id).value = '')
  );
  document.getElementById('billAttachment').value = '';
  document.getElementById('billRecurring').checked = false;
  document.getElementById('billReminderFrequency').value = '';
}

document.getElementById('saveBillBtn').addEventListener('click', async () => {
  const banner = document.getElementById('addBanner');
  const category = document.getElementById('billCategory').value;
  const form = new FormData();
  form.append('billName', document.getElementById('billName').value.trim());
  form.append('billCategory', category);
  form.append('dueDate', document.getElementById('billDueDate').value);
  form.append('amount', document.getElementById('billAmount').value);
  form.append('reminderFrequency', document.getElementById('billReminderFrequency').value);
  form.append('notes', document.getElementById('billNotes').value);
  form.append('isRecurring', document.getElementById('billRecurring').checked);
  if (category === 'Debt Payments') {
    form.append('loanType', document.getElementById('billLoanType').value.trim());
    form.append('totalLoanAmount', document.getElementById('billTotalLoanAmount').value);
  }
  if (category === 'House Rent') {
    form.append('periodFrom', document.getElementById('billPeriodFrom').value);
    form.append('periodTo', document.getElementById('billPeriodTo').value);
  }
  const file = document.getElementById('billAttachment').files[0];
  if (file) form.append('attachment', file);

  try {
    const data = await api('/bills', { method: 'POST', body: form, isForm: true });
    showBanner(banner, data.message, 'success');
    resetAddForm();
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

// ---- Bills Overview ----
async function loadOverview() {
  const category = document.getElementById('ovCategory').value;
  const fromDate = document.getElementById('ovFrom').value;
  const toDate = document.getElementById('ovTo').value;
  const status = document.getElementById('ovStatus').value;
  const qs = new URLSearchParams({ category, fromDate, toDate, status });
  const data = await api(`/bills/overview?${qs}`);

  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = categories
    .filter((c) => c !== 'All')
    .map((c) => {
      const found = data.counts.find((x) => x.bill_category === c);
      return `<div class="category-card" onclick="document.getElementById('ovCategory').value='${c}';loadOverview()">
        <span class="category-icon">${CATEGORY_ICONS[c] || '🧾'}</span><br>${c}<span class="count">${found ? found.count : 0}</span></div>`;
    })
    .join('');

  const thead = document.getElementById('ovTableHead');
  const tbody = document.getElementById('ovRows');
  tbody.innerHTML = '';
  document.getElementById('ovEmpty').classList.toggle('hidden', data.bills.length > 0);

  if (category === 'Debt Payments') {
    thead.innerHTML = '<tr><th>SL No</th><th>Loan Type</th><th>Monthly EMI (in Rs)</th><th>Bill Due Date</th><th>Total Loan Amount (in Rs)</th><th colspan="2"></th></tr>';
    data.bills.forEach((b, i) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td><td>${b.loan_type || b.bill_name}</td><td>${b.amount}</td><td>${b.due_date}</td><td>${b.total_loan_amount ?? '-'}</td>
        <td><button class="btn secondary" data-edit="${b.bill_id}">Edit</button></td>
        <td><button class="btn secondary" data-del="${b.bill_id}">Delete</button></td>`;
      tr.querySelector('[data-edit]').addEventListener('click', () => openEditModal(b));
      tr.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('Delete this bill?')) return;
        await api(`/bills/${b.bill_id}`, { method: 'DELETE' });
        loadOverview();
      });
      tbody.appendChild(tr);
    });
    return;
  }

  if (category === 'House Rent') {
    thead.innerHTML = '<tr><th>SL No</th><th>Month</th><th>From</th><th>To</th><th>Amount (in Rs)</th><th>Due Date</th><th colspan="2"></th></tr>';
    data.bills.forEach((b, i) => {
      const month = new Date(b.period_from || b.due_date).toLocaleString('default', { month: 'long', year: 'numeric' });
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i + 1}</td><td>${month}</td><td>${b.period_from || '-'}</td><td>${b.period_to || '-'}</td><td>${b.amount}</td><td>${b.due_date}</td>
        <td><button class="btn secondary" data-edit="${b.bill_id}">Edit</button></td>
        <td><button class="btn secondary" data-del="${b.bill_id}">Delete</button></td>`;
      tr.querySelector('[data-edit]').addEventListener('click', () => openEditModal(b));
      tr.querySelector('[data-del]').addEventListener('click', async () => {
        if (!confirm('Delete this bill?')) return;
        await api(`/bills/${b.bill_id}`, { method: 'DELETE' });
        loadOverview();
      });
      tbody.appendChild(tr);
    });
    return;
  }

  thead.innerHTML = '<tr><th>Bill Name</th><th>Category</th><th>Due Date</th><th>Amount</th><th>Status</th><th colspan="2"></th></tr>';
  data.bills.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.bill_name}</td><td>${b.bill_category}</td><td>${b.due_date}</td><td>₹${b.amount}</td>
      <td>${statusBadge(b.payment_status)}</td>
      <td><button class="btn secondary" data-edit="${b.bill_id}">Edit</button></td>
      <td><button class="btn secondary" data-del="${b.bill_id}">Delete</button></td>`;
    tr.querySelector('[data-edit]').addEventListener('click', () => openEditModal(b));
    tr.querySelector('[data-del]').addEventListener('click', async () => {
      if (!confirm('Delete this bill?')) return;
      await api(`/bills/${b.bill_id}`, { method: 'DELETE' });
      loadOverview();
    });
    tbody.appendChild(tr);
  });
}

function statusBadge(status) {
  if (status === 'Paid') return '<span class="badge green">Paid</span>';
  if (status === 'Partially Paid') return '<span class="badge blue">Partially Paid</span>';
  return '<span class="badge gray">Not Paid</span>';
}

// ---- Edit Bill ----
let currentEditBillId = null;
function openEditModal(bill) {
  currentEditBillId = bill.bill_id;
  document.getElementById('editBillCategory').innerHTML = categories
    .filter((c) => c !== 'All')
    .map((c) => `<option value="${c}" ${c === bill.bill_category ? 'selected' : ''}>${c}</option>`)
    .join('');
  document.getElementById('editBillName').value = bill.bill_name;
  document.getElementById('editBillDueDate').value = bill.due_date;
  document.getElementById('editBillAmount').value = bill.amount;
  document.getElementById('editBillReminderFrequency').value = bill.reminder_frequency || '';
  document.getElementById('editBillNotes').value = bill.notes || '';
  document.getElementById('editBillRecurring').checked = !!bill.is_recurring;
  document.getElementById('editDebtFieldsWrap').classList.toggle('hidden', bill.bill_category !== 'Debt Payments');
  document.getElementById('editRentFieldsWrap').classList.toggle('hidden', bill.bill_category !== 'House Rent');
  document.getElementById('editBillLoanType').value = bill.loan_type || '';
  document.getElementById('editBillTotalLoanAmount').value = bill.total_loan_amount ?? '';
  document.getElementById('editBillPeriodFrom').value = bill.period_from || '';
  document.getElementById('editBillPeriodTo').value = bill.period_to || '';
  hideBanner(document.getElementById('editBanner'));
  document.getElementById('editModal').classList.remove('hidden');
}
function closeEditModal() {
  document.getElementById('editModal').classList.add('hidden');
}
document.getElementById('editBillCategory').addEventListener('change', (e) => {
  document.getElementById('editDebtFieldsWrap').classList.toggle('hidden', e.target.value !== 'Debt Payments');
  document.getElementById('editRentFieldsWrap').classList.toggle('hidden', e.target.value !== 'House Rent');
});
document.getElementById('confirmEditBtn').addEventListener('click', async () => {
  const banner = document.getElementById('editBanner');
  const category = document.getElementById('editBillCategory').value;
  try {
    await api(`/bills/${currentEditBillId}`, {
      method: 'PUT',
      body: {
        billName: document.getElementById('editBillName').value.trim(),
        billCategory: category,
        dueDate: document.getElementById('editBillDueDate').value,
        amount: Number(document.getElementById('editBillAmount').value),
        reminderFrequency: document.getElementById('editBillReminderFrequency').value,
        notes: document.getElementById('editBillNotes').value,
        isRecurring: document.getElementById('editBillRecurring').checked,
        loanType: category === 'Debt Payments' ? document.getElementById('editBillLoanType').value.trim() : undefined,
        totalLoanAmount: category === 'Debt Payments' ? Number(document.getElementById('editBillTotalLoanAmount').value) : undefined,
        periodFrom: category === 'House Rent' ? document.getElementById('editBillPeriodFrom').value : undefined,
        periodTo: category === 'House Rent' ? document.getElementById('editBillPeriodTo').value : undefined,
      },
    });
    closeEditModal();
    loadOverview();
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

// ---- Upcoming / Overdue ----
async function loadOverdue(sort) {
  const category = document.getElementById('odCategory').value;
  const search = document.getElementById('odSearch').value;
  const qs = new URLSearchParams({ category, search, sort: sort ? 'overdue_desc' : '' });
  const data = await api(`/bills/upcoming-overdue?${qs}`);
  const tbody = document.getElementById('odRows');
  tbody.innerHTML = '';
  document.getElementById('odEmpty').classList.toggle('hidden', data.bills.length > 0);
  data.bills.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>₹${b.amount_due}</td><td>₹${b.amount}</td><td>${b.bill_name}</td><td>${b.due_date}</td>
      <td>${b.overdue_days > 0 ? b.overdue_days + ' days' : dueLabelBadge(b.due_label)}</td>
      <td>${statusBadge(b.payment_status)}</td>
      <td><button class="btn" data-pay="${b.bill_id}" data-amount="${b.amount_due}">Pay Now</button></td>`;
    tr.querySelector('[data-pay]').addEventListener('click', () => openPayModal(b.bill_id, b.amount_due));
    tbody.appendChild(tr);
  });
}

function dueLabelBadge(label) {
  if (label === 'Due soon') return '<span class="badge orange">Due soon</span>';
  if (label === 'Due later') return '<span class="badge gray">Due later</span>';
  return `<span class="badge gray">${label}</span>`;
}

// ---- Pay Now Modal (method -> bank/card -> confirm) ----
const BANKS = [
  { name: 'State Bank of India', color: '#1a73c7' },
  { name: 'Bank of Baroda', color: '#e8734a' },
  { name: 'Union Bank', color: '#c0392b' },
  { name: 'HDFC Bank', color: '#004c8f' },
  { name: 'Axis Bank', color: '#97144d' },
  { name: 'Kotak Mahindra Bank', color: '#ed1c24' },
  { name: 'ICICI Bank', color: '#e6701e' },
];
const MORE_BANKS = [
  { name: 'Punjab National Bank', color: '#6a1b9a' },
  { name: 'Canara Bank', color: '#f9a825' },
  { name: 'Yes Bank', color: '#263238' },
];
let selectedBank = null;
let payShowingMoreBanks = false;

function openPayModal(billId, amount) {
  currentPayBillId = billId;
  selectedPayMethod = null;
  selectedBank = null;
  payShowingMoreBanks = false;
  document.getElementById('payAmount').value = amount;
  document.querySelectorAll('.pay-method').forEach((el) => el.classList.remove('selected'));
  document.getElementById('payStepMethod').classList.remove('hidden');
  document.getElementById('payStepBank').classList.add('hidden');
  document.getElementById('payStepCard').classList.add('hidden');
  hideBanner(document.getElementById('cardBanner'));
  document.getElementById('payModal').classList.remove('hidden');
}
function closePayModal() {
  document.getElementById('payModal').classList.add('hidden');
}
document.querySelectorAll('.pay-method').forEach((el) => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.pay-method').forEach((x) => x.classList.remove('selected'));
    el.classList.add('selected');
    selectedPayMethod = el.dataset.method;
  });
});

function renderBankGrid() {
  const list = payShowingMoreBanks ? [...BANKS, ...MORE_BANKS] : BANKS;
  document.getElementById('bankGrid').innerHTML = list
    .map(
      (b) =>
        `<div class="bank-card ${selectedBank === b.name ? 'selected' : ''}" style="background:${b.color}" data-bank="${b.name}">${b.name}</div>`
    )
    .join('');
  document.querySelectorAll('.bank-card').forEach((el) => {
    el.addEventListener('click', () => {
      selectedBank = el.dataset.bank;
      renderBankGrid();
      document.getElementById('confirmPayBankBtn').disabled = false;
    });
  });
  document.getElementById('bankMoreBtn').classList.toggle('hidden', payShowingMoreBanks);
}

document.getElementById('payNextBtn').addEventListener('click', () => {
  if (!selectedPayMethod) return alert('Please select a payment method.');
  if (!document.getElementById('payAmount').value) return alert('Please enter an amount.');
  document.getElementById('payStepMethod').classList.add('hidden');
  if (selectedPayMethod === 'Net Banking') {
    renderBankGrid();
    document.getElementById('confirmPayBankBtn').disabled = true;
    document.getElementById('payStepBank').classList.remove('hidden');
  } else {
    document.getElementById('payCardAmountDisplay').textContent = document.getElementById('payAmount').value;
    document.getElementById('payStepCard').classList.remove('hidden');
  }
});
document.getElementById('bankMoreBtn').addEventListener('click', () => {
  payShowingMoreBanks = true;
  renderBankGrid();
});
document.getElementById('payBackFromBankBtn').addEventListener('click', () => {
  document.getElementById('payStepBank').classList.add('hidden');
  document.getElementById('payStepMethod').classList.remove('hidden');
});
document.getElementById('payBackFromCardBtn').addEventListener('click', () => {
  document.getElementById('payStepCard').classList.add('hidden');
  document.getElementById('payStepMethod').classList.remove('hidden');
});

async function submitPayment(extra) {
  const amount = Number(document.getElementById('payAmount').value);
  try {
    await api(`/bills/${currentPayBillId}/pay-now`, {
      method: 'POST',
      body: { amount, paymentMode: selectedPayMethod, ...extra },
    });
    closePayModal();
    loadOverdue();
    return true;
  } catch (err) {
    return err.message;
  }
}

document.getElementById('confirmPayBankBtn').addEventListener('click', async () => {
  if (!selectedBank) return;
  const result = await submitPayment({ paymentInstitution: selectedBank });
  if (result !== true) alert(result);
});

document.getElementById('confirmPayCardBtn').addEventListener('click', async () => {
  const banner = document.getElementById('cardBanner');
  const cardNumber = document.getElementById('cardNumber').value.replace(/\s+/g, '');
  const cardHolderName = document.getElementById('cardHolderName').value.trim();
  const expiry = document.getElementById('cardExpiry').value.trim();
  const cvv = document.getElementById('cardCvv').value.trim();
  if (!cardHolderName || cardNumber.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || cvv.length < 3) {
    return showBanner(banner, 'Please fill in valid card details.', 'error');
  }
  const result = await submitPayment({ cardHolderName, cardLast4: cardNumber.slice(-4) });
  if (result !== true) showBanner(banner, result, 'error');
});

// ---- Snooze or Mark Paid ----
async function loadSnooze() {
  const category = document.getElementById('snCategory').value;
  const search = document.getElementById('snSearch').value;
  const qs = new URLSearchParams({ category, search });
  const data = await api(`/bills/snooze-list?${qs}`);
  const tbody = document.getElementById('snRows');
  tbody.innerHTML = '';
  document.getElementById('snEmpty').classList.toggle('hidden', data.bills.length > 0);
  data.bills.forEach((b) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${b.bill_name}</td><td>${b.due_date}</td><td>${statusBadge(b.payment_status)}${b.snoozed_until ? ' <span class="badge blue">Snoozed till ' + b.snoozed_until + '</span>' : ''}</td>
      <td class="row-actions">
        <input type="date" data-snoozedate="${b.bill_id}" style="width:130px" />
        <button class="btn secondary" data-snooze="${b.bill_id}">Snooze</button>
        <button class="btn" data-paid="${b.bill_id}" ${b.payment_status === 'Paid' ? 'disabled' : ''}>Mark Paid</button>
      </td>`;
    tr.querySelector('[data-snooze]').addEventListener('click', async () => {
      const dateInput = tr.querySelector('[data-snoozedate]');
      if (!dateInput.value) return alert('Select a date to snooze until.');
      await api(`/bills/${b.bill_id}/snooze`, { method: 'POST', body: { untilDate: dateInput.value } });
      loadSnooze();
    });
    tr.querySelector('[data-paid]').addEventListener('click', async () => {
      await api(`/bills/${b.bill_id}/mark-paid`, { method: 'POST', body: {} });
      loadSnooze();
    });
    tbody.appendChild(tr);
  });
}

// ---- Reminder Settings ----
async function loadReminderBillOptions() {
  const category = document.getElementById('rmCategory').value;
  const qs = new URLSearchParams({ category });
  const data = await api(`/bills/overview?${qs}`);
  const select = document.getElementById('rmBillSelect');
  select.innerHTML = '<option value="">Select a bill</option>' + data.bills.map((b) => `<option value="${b.bill_id}">${b.bill_name}</option>`).join('');
}
document.getElementById('rmCategory').addEventListener('change', loadReminderBillOptions);
document.getElementById('rmBillSelect').addEventListener('change', async (e) => {
  const billId = e.target.value;
  const wrap = document.getElementById('rmFormWrap');
  if (!billId) return wrap.classList.add('hidden');
  const data = await api(`/reminders/${billId}`);
  wrap.classList.remove('hidden');
  wrap.dataset.billId = billId;
  const r = data.reminder;
  document.getElementById('rmFrequency').value = r ? r.reminder_frequency : 'Weekly';
  document.getElementById('rmStartDate').value = r ? r.reminder_start_date || '' : '';
  document.getElementById('rmMessage').value = r ? r.custom_message || '' : '';
  document.getElementById('rmPreference').value = r ? r.notification_preference || 'Email' : 'Email';
  document.getElementById('rmRecurring').checked = r ? !!r.is_recurring : false;
});
document.getElementById('rmSaveBtn').addEventListener('click', async () => {
  const billId = document.getElementById('rmFormWrap').dataset.billId;
  const banner = document.getElementById('rmBanner');
  try {
    const data = await api(`/reminders/${billId}`, {
      method: 'PUT',
      body: {
        reminderFrequency: document.getElementById('rmFrequency').value,
        reminderStartDate: document.getElementById('rmStartDate').value,
        customMessage: document.getElementById('rmMessage').value,
        notificationPreference: document.getElementById('rmPreference').value,
        isRecurring: document.getElementById('rmRecurring').checked,
      },
    });
    showBanner(banner, data.message, 'success');
  } catch (err) {
    showBanner(banner, err.message, 'error');
  }
});

loadCategories();
