const crypto = require('crypto');
const billRepository = require('../repositories/billRepository');
const scheduledPaymentRepository = require('../repositories/scheduledPaymentRepository');
const { PAYMENT_METHODS } = require('../models/constants');

function schedulePayment(userId, billId, data) {
  const bill = billRepository.findByIdForUser(billId, userId);
  if (!bill) return { ok: false, status: 404, message: 'Bill not found.' };

  const { payeeName, payeeAddress, payeeBankDetails, paymentFrequency, paymentMode, payerAccountNumber, purposeOfPayment, scheduledDate, amount } = data;
  if (!payeeName || !scheduledDate || !amount || !paymentMode) {
    return { ok: false, status: 400, message: 'Payee name, payment mode, scheduled date and amount are required.' };
  }
  if (!PAYMENT_METHODS.includes(paymentMode)) {
    return { ok: false, status: 400, message: 'Invalid payment method.' };
  }
  if (!bill.is_recurring && paymentFrequency) {
    return { ok: false, status: 400, message: 'Payment frequency is only available for recurring bills.' };
  }

  const scheduled = scheduledPaymentRepository.create({
    scheduled_payment_id: crypto.randomUUID(),
    bill_id: billId,
    payee_name: payeeName,
    payee_address: payeeAddress || null,
    payee_bank_details: payeeBankDetails || null,
    payment_frequency: bill.is_recurring ? (paymentFrequency || null) : null,
    payment_mode: paymentMode,
    payer_account_number: payerAccountNumber || null,
    purpose_of_payment: purposeOfPayment || null,
    scheduled_date: scheduledDate,
    amount,
    status: 'Scheduled',
  });
  return { ok: true, message: `${bill.bill_name} scheduled for payment!!`, scheduled };
}

function listScheduled(userId, filters) {
  return scheduledPaymentRepository.listForUser(userId, filters);
}

function cancel(userId, scheduledPaymentId) {
  const sp = scheduledPaymentRepository.findById(scheduledPaymentId);
  if (!sp) return { ok: false, status: 404, message: 'Scheduled payment not found.' };
  const bill = billRepository.findByIdForUser(sp.bill_id, userId);
  if (!bill) return { ok: false, status: 404, message: 'Scheduled payment not found.' };
  if (sp.status !== 'Scheduled') return { ok: false, status: 400, message: `This payment is already ${sp.status.toLowerCase()}.` };
  const updated = scheduledPaymentRepository.updateStatus(scheduledPaymentId, 'Cancelled');
  return { ok: true, message: `Schedule Payment of ${bill.bill_name} Cancelled!`, scheduled: updated };
}

function modify(userId, scheduledPaymentId, newDate) {
  const sp = scheduledPaymentRepository.findById(scheduledPaymentId);
  if (!sp) return { ok: false, status: 404, message: 'Scheduled payment not found.' };
  const bill = billRepository.findByIdForUser(sp.bill_id, userId);
  if (!bill) return { ok: false, status: 404, message: 'Scheduled payment not found.' };
  if (sp.status !== 'Scheduled') return { ok: false, status: 400, message: `This payment is already ${sp.status.toLowerCase()}.` };
  const updated = scheduledPaymentRepository.updateScheduleDate(scheduledPaymentId, newDate);
  return { ok: true, message: 'Schedule Payment Date Changed!!', scheduled: updated };
}

module.exports = { schedulePayment, listScheduled, cancel, modify };
