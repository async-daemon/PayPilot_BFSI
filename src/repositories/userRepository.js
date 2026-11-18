const db = require('../config/db');

function findByUserId(userId) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
}

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function create(user) {
  db.prepare(`
    INSERT INTO users (user_id, email, password, pan_details, bank_account_number, ifsc_code, banking_partner, is_admin, status)
    VALUES (@user_id, @email, @password, @pan_details, @bank_account_number, @ifsc_code, @banking_partner, @is_admin, @status)
  `).run(user);
  return findByUserId(user.user_id);
}

function updatePassword(userId, hashedPassword) {
  db.prepare('UPDATE users SET password = ?, failed_attempts = 0, locked = 0 WHERE user_id = ?').run(hashedPassword, userId);
}

function setResetOtp(userId, otp, expires) {
  db.prepare('UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE user_id = ?').run(otp, expires, userId);
}

function setLoginOtp(userId, otp, expires) {
  db.prepare('UPDATE users SET login_otp = ?, login_otp_expires = ? WHERE user_id = ?').run(otp, expires, userId);
}

function incrementFailedAttempts(userId) {
  db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE user_id = ?').run(userId);
  return findByUserId(userId);
}

function lockAccount(userId) {
  db.prepare('UPDATE users SET locked = 1 WHERE user_id = ?').run(userId);
}

function resetFailedAttempts(userId) {
  db.prepare('UPDATE users SET failed_attempts = 0 WHERE user_id = ?').run(userId);
}

function setStatus(userId, status) {
  db.prepare('UPDATE users SET status = ? WHERE user_id = ?').run(status, userId);
}

function listPending() {
  return db.prepare("SELECT user_id, email, created_at FROM users WHERE status = 'pending'").all();
}

module.exports = {
  findByUserId,
  findByEmail,
  create,
  updatePassword,
  setResetOtp,
  setLoginOtp,
  incrementFailedAttempts,
  lockAccount,
  resetFailedAttempts,
  setStatus,
  listPending,
};
