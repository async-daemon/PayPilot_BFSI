const billRepository = require('../repositories/billRepository');
const paymentRepository = require('../repositories/paymentRepository');
const { BILL_STATUS } = require('../models/constants');

function paymentProgress(userId, filters) {
  const bills = billRepository.listForUser(userId, filters);
  return bills.map((bill) => {
    const paid = paymentRepository.totalPaidForBill(bill.bill_id);
    const progressPercent = bill.amount > 0 ? Math.min(100, Math.round((paid / bill.amount) * 100)) : 0;
    let color = 'red';
    if (bill.payment_status === BILL_STATUS.PAID) color = 'green';
    else if (progressPercent > 0) color = 'blue';
    return {
      bill_id: bill.bill_id,
      bill_name: bill.bill_name,
      bill_category: bill.bill_category,
      due_date: bill.due_date,
      amount: bill.amount,
      amount_paid: paid,
      progress_percent: progressPercent,
      progress_color: color,
    };
  });
}

function paymentOverview(userId, filters) {
  const bills = billRepository.listForUser(userId, filters);
  const today = new Date().toISOString().slice(0, 10);
  return bills.map((bill) => ({
    bill_id: bill.bill_id,
    bill_name: bill.bill_name,
    bill_category: bill.bill_category,
    due_date: bill.due_date,
    amount: bill.amount,
    payment_status: bill.payment_status === BILL_STATUS.PAID ? 'Paid' : (bill.due_date >= today ? 'Due soon' : 'Overdue'),
  }));
}

function paymentHistory(userId, filters) {
  return paymentRepository.listForUser(userId, filters);
}

module.exports = { paymentProgress, paymentOverview, paymentHistory };
