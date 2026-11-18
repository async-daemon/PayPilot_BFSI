const crypto = require('crypto');
const billRepository = require('../repositories/billRepository');
const reminderRepository = require('../repositories/reminderRepository');
const { REMINDER_FREQUENCIES } = require('../models/constants');

function upsertReminder(userId, billId, data) {
  const bill = billRepository.findByIdForUser(billId, userId);
  if (!bill) return { ok: false, status: 404, message: 'Bill not found.' };
  const { reminderFrequency, reminderStartDate, customMessage, notificationPreference, isRecurring } = data;
  if (reminderFrequency && !REMINDER_FREQUENCIES.includes(reminderFrequency)) {
    return { ok: false, status: 400, message: 'Invalid reminder frequency.' };
  }
  const existing = reminderRepository.findByBillId(billId);
  const reminder = {
    reminder_id: existing ? existing.reminder_id : crypto.randomUUID(),
    bill_id: billId,
    reminder_frequency: reminderFrequency || (existing && existing.reminder_frequency) || 'Weekly',
    reminder_start_date: reminderStartDate || (existing && existing.reminder_start_date) || null,
    custom_message: customMessage || (existing && existing.custom_message) || null,
    notification_preference: notificationPreference || (existing && existing.notification_preference) || 'Email',
    is_recurring: isRecurring !== undefined ? (isRecurring ? 1 : 0) : existing ? existing.is_recurring : 0,
  };
  const saved = reminderRepository.upsert(reminder);
  return { ok: true, message: 'Reminder settings updated!!', reminder: saved };
}

function getReminder(userId, billId) {
  const bill = billRepository.findByIdForUser(billId, userId);
  if (!bill) return { ok: false, status: 404, message: 'Bill not found.' };
  return { ok: true, reminder: reminderRepository.findByBillId(billId) || null };
}

module.exports = { upsertReminder, getReminder };
