const db = require('../config/db');

function create(bill) {
  db.prepare(`
    INSERT INTO bills (bill_id, user_id, bill_name, bill_category, due_date, amount, reminder_frequency, attachment, notes, is_recurring, payment_status, loan_type, total_loan_amount, period_from, period_to)
    VALUES (@bill_id, @user_id, @bill_name, @bill_category, @due_date, @amount, @reminder_frequency, @attachment, @notes, @is_recurring, @payment_status, @loan_type, @total_loan_amount, @period_from, @period_to)
  `).run({
    loan_type: null,
    total_loan_amount: null,
    period_from: null,
    period_to: null,
    ...bill,
  });
  return findById(bill.bill_id);
}

function findById(billId) {
  return db.prepare('SELECT * FROM bills WHERE bill_id = ?').get(billId);
}

function update(billId, userId, fields) {
  const existing = findByIdForUser(billId, userId);
  if (!existing) return null;
  const merged = { ...existing, ...fields };
  db.prepare(`
    UPDATE bills SET bill_name=@bill_name, bill_category=@bill_category, due_date=@due_date, amount=@amount,
      reminder_frequency=@reminder_frequency, attachment=@attachment, notes=@notes, is_recurring=@is_recurring,
      payment_status=@payment_status, snoozed_until=@snoozed_until, loan_type=@loan_type,
      total_loan_amount=@total_loan_amount, period_from=@period_from, period_to=@period_to
    WHERE bill_id=@bill_id AND user_id=@user_id
  `).run(merged);
  return findById(billId);
}

function remove(billId, userId) {
  const result = db.prepare('DELETE FROM bills WHERE bill_id = ? AND user_id = ?').run(billId, userId);
  return result.changes > 0;
}

function findByIdForUser(billId, userId) {
  return db.prepare('SELECT * FROM bills WHERE bill_id = ? AND user_id = ?').get(billId, userId);
}

function listForUser(userId, { category, fromDate, toDate, status, search } = {}) {
  let query = 'SELECT * FROM bills WHERE user_id = ?';
  const params = [userId];

  if (category && category !== 'All') {
    query += ' AND bill_category = ?';
    params.push(category);
  }
  if (fromDate) {
    query += ' AND due_date >= ?';
    params.push(fromDate);
  }
  if (toDate) {
    query += ' AND due_date <= ?';
    params.push(toDate);
  }
  if (status) {
    query += ' AND payment_status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND bill_name LIKE ?';
    params.push(`%${search}%`);
  }
  query += ' ORDER BY due_date ASC';
  return db.prepare(query).all(...params);
}

function countByCategory(userId) {
  return db.prepare(`
    SELECT bill_category, COUNT(*) as count FROM bills WHERE user_id = ? GROUP BY bill_category
  `).all(userId);
}

function setPaymentStatus(billId, userId, status) {
  db.prepare('UPDATE bills SET payment_status = ? WHERE bill_id = ? AND user_id = ?').run(status, billId, userId);
  return findById(billId);
}

function setSnoozedUntil(billId, userId, date) {
  db.prepare('UPDATE bills SET snoozed_until = ? WHERE bill_id = ? AND user_id = ?').run(date, billId, userId);
  return findById(billId);
}

module.exports = {
  create,
  findById,
  findByIdForUser,
  update,
  remove,
  listForUser,
  countByCategory,
  setPaymentStatus,
  setSnoozedUntil,
};
