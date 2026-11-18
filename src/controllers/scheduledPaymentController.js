const express = require('express');
const scheduledPaymentService = require('../services/scheduledPaymentService');
const { requireAuth } = require('../middleware/authMiddleware');
const { PAYMENT_METHODS } = require('../models/constants');

const router = express.Router();
router.use(requireAuth);

router.get('/payment-methods', (req, res) => res.json({ methods: PAYMENT_METHODS }));

router.get('/', (req, res) => {
  const { category, fromDate, toDate } = req.query;
  res.json({ scheduled: scheduledPaymentService.listScheduled(req.userId, { category, fromDate, toDate }) });
});

router.post('/bill/:billId', (req, res) => {
  const result = scheduledPaymentService.schedulePayment(req.userId, req.params.billId, req.body);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.status(201).json(result);
});

router.post('/:scheduledPaymentId/cancel', (req, res) => {
  const result = scheduledPaymentService.cancel(req.userId, req.params.scheduledPaymentId);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

router.post('/:scheduledPaymentId/modify', (req, res) => {
  const { scheduledDate } = req.body;
  const result = scheduledPaymentService.modify(req.userId, req.params.scheduledPaymentId, scheduledDate);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

module.exports = router;
