const crypto = require('crypto');
const billRepository = require('../repositories/billRepository');
const paymentRepository = require('../repositories/paymentRepository');
const { BILL_CATEGORIES, BILL_STATUS } = require('../models/constants');

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function daysBetween(dateA, dateB) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((new Date(dateA) - new Date(dateB)) / MS_PER_DAY);
}

function addBill(userId, data) {
  const {
    billName, billCategory, dueDate, amount, reminderFrequency, attachment, notes, isRecurring,
    loanType, totalLoanAmount, periodFrom, periodTo,
  } = data;
  if (!billName || !billCategory || !dueDate || amount === undefined) {
    return { ok: false, status: 400, message: 'Bill name, category, due date and amount are required.' };
  }
  if (!BILL_CATEGORIES.includes(billCategory)) {
    return { ok: false, status: 400, message: 'Invalid bill category.' };
  }
  const recurring = !!isRecurring;
  const occurrences = recurring ? 3 : 1; // current + next 2 occurrences when recurring
  const created = [];
  for (let i = 0; i < occurrences; i += 1) {
    const bill = {
      bill_id: crypto.randomUUID(),
      user_id: userId,
      bill_name: billName,
      bill_category: billCategory,
      due_date: i === 0 ? dueDate : addMonths(dueDate, i),
      amount,
      reminder_frequency: reminderFrequency || null,
      attachment: attachment || null,
      notes: notes || null,
      is_recurring: recurring ? 1 : 0,
      payment_status: BILL_STATUS.NOT_PAID,
      loan_type: billCategory === 'Debt Payments' ? (loanType || null) : null,
      total_loan_amount: billCategory === 'Debt Payments' && totalLoanAmount ? Number(totalLoanAmount) : null,
      period_from: billCategory === 'House Rent' && periodFrom ? (i === 0 ? periodFrom : addMonths(periodFrom, i)) : null,
      period_to: billCategory === 'House Rent' && periodTo ? (i === 0 ? periodTo : addMonths(periodTo, i)) : null,
    };
    created.push(billRepository.create(bill));
  }
  return { ok: true, message: 'Bill successfully added', bills: created };
}

function updateBill(userId, billId, data) {
  const existing = billRepository.findByIdForUser(billId, userId);
  if (!existing) return { ok: false, status: 404, message: 'Bill not found.' };
  const fields = {
    bill_name: data.billName ?? existing.bill_name,
    bill_category: data.billCategory ?? existing.bill_category,
    due_date: data.dueDate ?? existing.due_date,
    amount: data.amount ?? existing.amount,
    reminder_frequency: data.reminderFrequency ?? existing.reminder_frequency,
    attachment: data.attachment ?? existing.attachment,
    notes: data.notes ?? existing.notes,
    is_recurring: data.isRecurring !== undefined ? (data.isRecurring ? 1 : 0) : existing.is_recurring,
    payment_status: existing.payment_status,
    snoozed_until: existing.snoozed_until,
    loan_type: data.loanType ?? existing.loan_type,
    total_loan_amount: data.totalLoanAmount !== undefined ? Number(data.totalLoanAmount) : existing.total_loan_amount,
    period_from: data.periodFrom ?? existing.period_from,
    period_to: data.periodTo ?? existing.period_to,
  };
  const updated = billRepository.update(billId, userId, fields);
  return { ok: true, bill: updated };
}

function deleteBill(userId, billId) {
  const removed = billRepository.remove(billId, userId);
  if (!removed) return { ok: false, status: 404, message: 'Bill not found.' };
  return { ok: true, message: 'Bill deleted successfully' };
}

function decorate(bill) {
  const today = new Date().toISOString().slice(0, 10);
  const overdueDays = daysBetween(today, bill.due_date);
  let dueLabel = 'Upcoming';
  if (bill.payment_status === BILL_STATUS.PAID) {
    dueLabel = 'Paid';
  } else if (overdueDays > 0) {
    dueLabel = 'Overdue';
  } else if (overdueDays >= -3) {
    dueLabel = 'Due soon';
  } else {
    dueLabel = 'Due later';
  }
  const paid = paymentRepository.totalPaidForBill(bill.bill_id);
  return {
    ...bill,
    overdue_days: overdueDays > 0 ? overdueDays : 0,
    due_label: dueLabel,
    amount_paid: paid,
    amount_due: Math.max(0, bill.amount - paid),
  };
}

function overview(userId, filters) {
  const bills = billRepository.listForUser(userId, filters).map(decorate);
  const counts = billRepository.countByCategory(userId);
  return { bills, counts };
}

function upcomingOverdue(userId, filters) {
  const bills = billRepository.listForUser(userId, filters)
    .map(decorate)
    .filter((b) => b.payment_status !== BILL_STATUS.PAID);
  return bills;
}

function snoozeOrMarkPaid(userId, filters) {
  return billRepository.listForUser(userId, filters).map(decorate);
}

function snoozeBill(userId, billId, untilDate) {
  const bill = billRepository.findByIdForUser(billId, userId);
  if (!bill) return { ok: false, status: 404, message: 'Bill not found.' };
  const updated = billRepository.setSnoozedUntil(billId, userId, untilDate);
  return { ok: true, message: `${bill.bill_name} bill successfully snoozed!`, bill: decorate(updated) };
}

function markPaid(userId, billId, { paymentMode, payerAccountNumber } = {}) {
  const bill = billRepository.findByIdForUser(billId, userId);
  if (!bill) return { ok: false, status: 404, message: 'Bill not found.' };
  const alreadyPaid = paymentRepository.totalPaidForBill(billId);
  const remaining = bill.amount - alreadyPaid;
  if (remaining > 0) {
    paymentRepository.create({
      payment_id: crypto.randomUUID(),
      bill_id: billId,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_mode: paymentMode || 'Manual',
      payer_account_number: payerAccountNumber || null,
      amount_paid: remaining,
      status: 'Paid',
    });
  }
  const updated = billRepository.setPaymentStatus(billId, userId, BILL_STATUS.PAID);
  return { ok: true, message: `${bill.bill_name} bill successfully paid!`, bill: decorate(updated) };
}

function payNow(userId, billId, { amount, paymentMode, payerAccountNumber, paymentInstitution, cardHolderName, cardLast4 }) {
  const bill = billRepository.findByIdForUser(billId, userId);
  if (!bill) return { ok: false, status: 404, message: 'Bill not found.' };
  if (!amount || amount <= 0) return { ok: false, status: 400, message: 'A valid amount is required.' };
  if (bill.payment_status === BILL_STATUS.PAID) {
    return { ok: false, status: 400, message: 'This bill is already fully paid.' };
  }
  const alreadyPaid = paymentRepository.totalPaidForBill(billId);
  const remaining = bill.amount - alreadyPaid;
  if (amount > remaining) {
    return { ok: false, status: 400, message: `Amount exceeds the outstanding balance of ₹${remaining}.` };
  }

  paymentRepository.create({
    payment_id: crypto.randomUUID(),
    bill_id: billId,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_mode: paymentMode,
    payer_account_number: payerAccountNumber || null,
    payment_institution: paymentInstitution || null,
    card_holder_name: cardHolderName || null,
    card_last4: cardLast4 || null,
    amount_paid: amount,
    status: 'Paid',
  });

  const totalPaid = paymentRepository.totalPaidForBill(billId);
  const newStatus = totalPaid >= bill.amount ? BILL_STATUS.PAID : BILL_STATUS.PARTIALLY_PAID;
  const updated = billRepository.setPaymentStatus(billId, userId, newStatus);
  return { ok: true, message: 'Payment successful', bill: decorate(updated) };
}

module.exports = {
  addBill,
  updateBill,
  deleteBill,
  overview,
  upcomingOverdue,
  snoozeOrMarkPaid,
  snoozeBill,
  markPaid,
  payNow,
  decorate,
};
