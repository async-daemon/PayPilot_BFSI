const express = require('express');
const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', (req, res) => {
  const result = authService.signup(req.body);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.status(201).json(result);
});

router.post('/screen-challenge', (req, res) => {
  const { userId } = req.body;
  const user = userRepository.findByUserId(userId);
  if (!user) return res.status(404).json({ message: "Account doesn't exist" });
  if (user.locked) return res.status(423).json({ message: 'Your account has been locked!!' });
  const { target, grid } = authService.makeChallenge(userId);
  res.json({ target, grid });
});

router.post('/verify-screen', (req, res) => {
  const { userId, answer } = req.body;
  const result = authService.verifyChallenge(userId, answer);
  if (!result.ok) return res.status(400).json({ message: result.message });
  const otp = authService.issueLoginOtp(userId);
  res.json({ message: 'Screen Verification Successful!!', devOtp: otp });
});

router.post('/verify-otp', (req, res) => {
  const { userId, otp } = req.body;
  const result = authService.verifyLoginOtp(userId, otp);
  if (!result.ok) return res.status(400).json({ message: result.message });
  res.json({ message: 'OTP Verified!' });
});

router.post('/login', (req, res) => {
  const { userId, password } = req.body;
  const result = authService.login(userId, password);
  if (!result.ok) return res.status(result.status).json({ message: result.message, attempts: result.attempts });
  res.json({ token: result.token, user: result.user });
});

router.post('/forgot/request', (req, res) => {
  const { userId, email } = req.body;
  const result = authService.requestPasswordReset(userId, email);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json({ message: 'OTP sent to your registered email id', devOtp: result.devOtp });
});

router.post('/forgot/verify', (req, res) => {
  const { userId, otp } = req.body;
  const result = authService.verifyPasswordResetOtp(userId, otp);
  if (!result.ok) return res.status(400).json({ message: result.message });
  res.json({ message: 'OTP Verified!' });
});

router.post('/forgot/reset', (req, res) => {
  const { userId, newPassword, confirmPassword } = req.body;
  const result = authService.resetPassword(userId, newPassword, confirmPassword);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json({ message: result.message });
});

router.get('/me', requireAuth, (req, res) => {
  const user = userRepository.findByUserId(req.userId);
  res.json({ user: authService.sanitize(user) });
});

// Application Admin: approves pending sign-up requests
router.get('/admin/pending-users', requireAuth, requireAdmin, (req, res) => {
  res.json({ users: userRepository.listPending() });
});

router.post('/admin/approve/:userId', requireAuth, requireAdmin, (req, res) => {
  userRepository.setStatus(req.params.userId, 'active');
  res.json({ message: 'User access approved.' });
});

module.exports = router;
