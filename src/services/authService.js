const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'paypilot-dev-secret-change-in-production';
const OTP_TTL_MS = 5 * 60 * 1000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 3;

// In-memory verification state for the two-step login flow (screen verification + OTP).
// A single-process demo store; a production deployment would back this with a cache like Redis.
const challengeStore = new Map(); // userId -> { question, answer, expires }
const screenVerified = new Map(); // userId -> expires
const otpVerified = new Map(); // userId -> expires
const resetVerified = new Map(); // userId -> expires

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

function isExpired(expires) {
  return !expires || Date.now() > expires;
}

// Image-selection "screen verification" grid, matching the BRD wireframe's
// "select all images with a bus" captcha (emoji stand in for real photos).
const CAPTCHA_OBJECTS = ['🚌', '🚗', '🚲', '🍊', '🍎', '🍌', '🏠', '⚽', '🌳'];

function makeChallenge(userId) {
  const target = CAPTCHA_OBJECTS[crypto.randomInt(0, CAPTCHA_OBJECTS.length)];
  const distractors = CAPTCHA_OBJECTS.filter((o) => o !== target);
  const matchCount = crypto.randomInt(2, 4); // 2-3 correct tiles
  const cells = [];
  for (let i = 0; i < matchCount; i += 1) cells.push(target);
  while (cells.length < 9) {
    cells.push(distractors[crypto.randomInt(0, distractors.length)]);
  }
  // shuffle
  for (let i = cells.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const grid = cells.map((emoji, id) => ({ id, emoji }));
  const correctIds = grid.filter((c) => c.emoji === target).map((c) => c.id);
  challengeStore.set(userId, { correctIds, expires: Date.now() + VERIFICATION_TTL_MS });
  return { target, grid };
}

function verifyChallenge(userId, selectedIds) {
  const entry = challengeStore.get(userId);
  if (!entry || isExpired(entry.expires)) {
    return { ok: false, message: 'Screen Verification Unsuccessful! Try Again' };
  }
  const selected = [...new Set((selectedIds || []).map(Number))].sort();
  const correct = [...entry.correctIds].sort();
  const matches = selected.length === correct.length && selected.every((v, i) => v === correct[i]);
  if (!matches) {
    return { ok: false, message: 'Screen Verification Unsuccessful! Try Again' };
  }
  challengeStore.delete(userId);
  screenVerified.set(userId, Date.now() + VERIFICATION_TTL_MS);
  return { ok: true };
}

function issueLoginOtp(userId) {
  const otp = generateOtp();
  userRepository.setLoginOtp(userId, otp, Date.now() + OTP_TTL_MS);
  return otp;
}

function verifyLoginOtp(userId, otp) {
  const user = userRepository.findByUserId(userId);
  if (!user || !user.login_otp || isExpired(user.login_otp_expires)) {
    return { ok: false, message: 'OTP expired. Please try again.' };
  }
  if (String(otp).trim() !== user.login_otp) {
    return { ok: false, message: 'Invalid OTP. Please try again.' };
  }
  userRepository.setLoginOtp(userId, null, null);
  otpVerified.set(userId, Date.now() + VERIFICATION_TTL_MS);
  return { ok: true };
}

function signup({ email, userId, panDetails, bankAccountNumber, ifscCode, bankingPartner, password, confirmPassword }) {
  if (!email || !userId || !password || !confirmPassword) {
    return { ok: false, status: 400, message: 'All required fields must be provided.' };
  }
  if (password !== confirmPassword) {
    return { ok: false, status: 400, message: 'Password and confirm password do not match.' };
  }
  if (userRepository.findByUserId(userId)) {
    return { ok: false, status: 409, message: 'Account already exists!' };
  }
  if (userRepository.findByEmail(email)) {
    return { ok: false, status: 409, message: 'Account already exists!' };
  }
  const hashed = bcrypt.hashSync(password, 10);
  const user = userRepository.create({
    user_id: userId,
    email,
    password: hashed,
    pan_details: panDetails || null,
    bank_account_number: bankAccountNumber || null,
    ifsc_code: ifscCode || null,
    banking_partner: bankingPartner || null,
    is_admin: 0,
    status: 'pending',
  });
  return { ok: true, message: 'User Access Successfully Raised!!', user: sanitize(user) };
}

function login(userId, password) {
  const user = userRepository.findByUserId(userId);
  if (!user) {
    return { ok: false, status: 404, message: "Account doesn't exist" };
  }
  if (user.locked) {
    return { ok: false, status: 423, message: 'Your account has been locked!! Use Forgot Password to reset.' };
  }
  if (user.status === 'pending') {
    return { ok: false, status: 403, message: 'Your access request is pending admin approval.' };
  }
  const screenOk = screenVerified.get(userId);
  const otpOk = otpVerified.get(userId);
  if (!screenOk || isExpired(screenOk) || !otpOk || isExpired(otpOk)) {
    return { ok: false, status: 400, message: 'Please complete Screen Verification and OTP Verification first.' };
  }
  const passwordMatches = bcrypt.compareSync(password, user.password);
  if (!passwordMatches) {
    const updated = userRepository.incrementFailedAttempts(userId);
    if (updated.failed_attempts >= MAX_FAILED_ATTEMPTS) {
      userRepository.lockAccount(userId);
      return { ok: false, status: 423, message: 'Invalid ID/Password. Your account has been locked!!', attempts: updated.failed_attempts };
    }
    return { ok: false, status: 401, message: 'Invalid ID/Password', attempts: updated.failed_attempts };
  }
  userRepository.resetFailedAttempts(userId);
  screenVerified.delete(userId);
  otpVerified.delete(userId);
  const token = jwt.sign({ userId: user.user_id, isAdmin: !!user.is_admin }, JWT_SECRET, { expiresIn: '8h' });
  return { ok: true, token, user: sanitize(user) };
}

function requestPasswordReset(userId, email) {
  const user = userRepository.findByUserId(userId);
  if (!user || user.email !== email) {
    return { ok: false, status: 404, message: "Account doesn't exist" };
  }
  const otp = generateOtp();
  userRepository.setResetOtp(userId, otp, Date.now() + OTP_TTL_MS);
  return { ok: true, devOtp: otp };
}

function verifyPasswordResetOtp(userId, otp) {
  const user = userRepository.findByUserId(userId);
  if (!user || !user.reset_otp || isExpired(user.reset_otp_expires)) {
    return { ok: false, message: 'OTP expired. Please try again.' };
  }
  if (String(otp).trim() !== user.reset_otp) {
    return { ok: false, message: 'Invalid OTP. Please try again.' };
  }
  userRepository.setResetOtp(userId, null, null);
  resetVerified.set(userId, Date.now() + VERIFICATION_TTL_MS);
  return { ok: true };
}

function resetPassword(userId, newPassword, confirmPassword) {
  const ok = resetVerified.get(userId);
  if (!ok || isExpired(ok)) {
    return { ok: false, status: 400, message: 'Please verify the OTP first.' };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, status: 400, message: 'Password and confirm password do not match.' };
  }
  const hashed = bcrypt.hashSync(newPassword, 10);
  userRepository.updatePassword(userId, hashed);
  resetVerified.delete(userId);
  return { ok: true, message: 'Password has been updated' };
}

function sanitize(user) {
  const { password, reset_otp, login_otp, ...safe } = user;
  return safe;
}

module.exports = {
  makeChallenge,
  verifyChallenge,
  issueLoginOtp,
  verifyLoginOtp,
  signup,
  login,
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
  sanitize,
  JWT_SECRET,
};
