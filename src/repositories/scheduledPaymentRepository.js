const db = require('../config/db');

function create(sp) {
  db.prepare(`
    INSERT INTO scheduled_payments
      (scheduled_payment_id, bill_id, payee_name, payee_address, payee_bank_details, payment_frequency,
       payment_mode, payer_account_number, purpose_of_payment, scheduled_date, amount, status)
    VALUES
      (@scheduled_payment_id, @bill_id, @payee_name, @payee_address, @payee_bank_details, @payment_frequency,
       @payment_mode, @payer_account_number, @purpose_of_payment, @scheduled_date, @amount, @status)
  `).run({ purpose_of_payment: null, ...sp });
  return findById(sp.scheduled_payment_id);
}

function findById(id) {
  return db.prepare('SELECT * FROM scheduled_payments WHERE scheduled_payment_id = ?').get(id);
}

function listForUser(userId, { fromDate, toDate, category } = {}) {
  let query = `
    SELECT sp.*, b.bill_name, b.bill_category, b.due_date, b.user_id
    FROM scheduled_payments sp JOIN bills b ON sp.bill_id = b.bill_id
    WHERE b.user_id = ?
  `;
  const params = [userId];
  if (category && category !== 'All') {
    query += ' AND b.bill_category = ?';
    params.push(category);
  }
  if (fromDate) {
    query += ' AND sp.scheduled_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND sp.scheduled_date <= ?';
    params.push(toDate);
  }
  query += ' ORDER BY sp.scheduled_date ASC';
  return db.prepare(query).all(...params);
}

function updateStatus(id, status) {
  db.prepare('UPDATE scheduled_payments SET status = ? WHERE scheduled_payment_id = ?').run(status, id);
  return findById(id);
}

function updateScheduleDate(id, date) {
  db.prepare('UPDATE scheduled_payments SET scheduled_date = ? WHERE scheduled_payment_id = ?').run(date, id);
  return findById(id);
}

module.exports = { create, findById, listForUser, updateStatus, updateScheduleDate };
