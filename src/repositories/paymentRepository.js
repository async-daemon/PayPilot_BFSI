const db = require('../config/db');

function create(payment) {
  db.prepare(`
    INSERT INTO payments (payment_id, bill_id, payment_date, payment_mode, payer_account_number, payment_institution, card_holder_name, card_last4, amount_paid, status)
    VALUES (@payment_id, @bill_id, @payment_date, @payment_mode, @payer_account_number, @payment_institution, @card_holder_name, @card_last4, @amount_paid, @status)
  `).run({
    payment_institution: null,
    card_holder_name: null,
    card_last4: null,
    ...payment,
  });
  return db.prepare('SELECT * FROM payments WHERE payment_id = ?').get(payment.payment_id);
}

function listForUser(userId, { fromDate, toDate, category } = {}) {
  let query = `
    SELECT p.*, b.bill_name, b.bill_category, b.due_date
    FROM payments p JOIN bills b ON p.bill_id = b.bill_id
    WHERE b.user_id = ?
  `;
  const params = [userId];
  if (category && category !== 'All') {
    query += ' AND b.bill_category = ?';
    params.push(category);
  }
  if (fromDate) {
    query += ' AND p.payment_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND p.payment_date <= ?';
    params.push(toDate);
  }
  query += ' ORDER BY p.payment_date DESC';
  return db.prepare(query).all(...params);
}

function totalPaidForBill(billId) {
  const row = db.prepare('SELECT COALESCE(SUM(amount_paid), 0) as total FROM payments WHERE bill_id = ?').get(billId);
  return row.total;
}

module.exports = { create, listForUser, totalPaidForBill };
