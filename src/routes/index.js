const express = require('express');

const router = express.Router();

router.use('/auth', require('../controllers/authController'));
router.use('/bills', require('../controllers/billController'));
router.use('/reminders', require('../controllers/reminderController'));
router.use('/scheduled-payments', require('../controllers/scheduledPaymentController'));
router.use('/payments', require('../controllers/paymentController'));

module.exports = router;
