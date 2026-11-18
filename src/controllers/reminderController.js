const express = require('express');
const reminderService = require('../services/reminderService');
const { requireAuth } = require('../middleware/authMiddleware');
const { REMINDER_FREQUENCIES } = require('../models/constants');

const router = express.Router();
router.use(requireAuth);

router.get('/frequencies', (req, res) => res.json({ frequencies: REMINDER_FREQUENCIES }));

router.get('/:billId', (req, res) => {
  const result = reminderService.getReminder(req.userId, req.params.billId);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

router.put('/:billId', (req, res) => {
  const result = reminderService.upsertReminder(req.userId, req.params.billId, req.body);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

module.exports = router;
