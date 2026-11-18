const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const billService = require('../services/billService');
const { requireAuth } = require('../middleware/authMiddleware');
const { BILL_CATEGORIES } = require('../models/constants');

const router = express.Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', '..', 'uploads'),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB per BRD wireframe
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF attachments are allowed.'));
    cb(null, true);
  },
});

router.get('/categories', (req, res) => res.json({ categories: ['All', ...BILL_CATEGORIES] }));

router.post('/', upload.single('attachment'), (req, res) => {
  const data = { ...req.body };
  data.amount = Number(data.amount);
  data.isRecurring = data.isRecurring === 'true' || data.isRecurring === true;
  if (req.file) data.attachment = `/uploads/${req.file.filename}`;
  const result = billService.addBill(req.userId, data);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.status(201).json(result);
});

router.put('/:billId', (req, res) => {
  const result = billService.updateBill(req.userId, req.params.billId, req.body);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

router.delete('/:billId', (req, res) => {
  const result = billService.deleteBill(req.userId, req.params.billId);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

router.get('/overview', (req, res) => {
  const { category, fromDate, toDate, status, search } = req.query;
  res.json(billService.overview(req.userId, { category, fromDate, toDate, status, search }));
});

router.get('/upcoming-overdue', (req, res) => {
  const { category, search, sort } = req.query;
  let bills = billService.upcomingOverdue(req.userId, { category, search });
  if (sort === 'overdue_desc') bills = bills.sort((a, b) => b.overdue_days - a.overdue_days);
  res.json({ bills });
});

router.get('/snooze-list', (req, res) => {
  const { category, search } = req.query;
  res.json({ bills: billService.snoozeOrMarkPaid(req.userId, { category, search }) });
});

router.post('/:billId/snooze', (req, res) => {
  const { untilDate } = req.body;
  const result = billService.snoozeBill(req.userId, req.params.billId, untilDate);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

router.post('/:billId/mark-paid', (req, res) => {
  const result = billService.markPaid(req.userId, req.params.billId, req.body);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

router.post('/:billId/pay-now', (req, res) => {
  const result = billService.payNow(req.userId, req.params.billId, req.body);
  if (!result.ok) return res.status(result.status).json({ message: result.message });
  res.json(result);
});

module.exports = router;
