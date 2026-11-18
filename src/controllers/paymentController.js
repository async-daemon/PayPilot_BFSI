const express = require('express');
const paymentService = require('../services/paymentService');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/progress', (req, res) => {
  const { category, search } = req.query;
  res.json({ bills: paymentService.paymentProgress(req.userId, { category, search }) });
});

router.get('/overview', (req, res) => {
  const { category, fromDate, toDate } = req.query;
  res.json({ bills: paymentService.paymentOverview(req.userId, { category, fromDate, toDate }) });
});

router.get('/history', (req, res) => {
  const { category, fromDate, toDate } = req.query;
  res.json({ payments: paymentService.paymentHistory(req.userId, { category, fromDate, toDate }) });
});

module.exports = router;
