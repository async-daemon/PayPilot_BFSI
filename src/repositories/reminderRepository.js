const db = require('../config/db');

function upsert(reminder) {
  const existing = findByBillId(reminder.bill_id);
  if (existing) {
    db.prepare(`
      UPDATE reminder_settings SET reminder_frequency=@reminder_frequency, reminder_start_date=@reminder_start_date,
        custom_message=@custom_message, notification_preference=@notification_preference, is_recurring=@is_recurring
      WHERE bill_id=@bill_id
    `).run(reminder);
  } else {
    db.prepare(`
      INSERT INTO reminder_settings (reminder_id, bill_id, reminder_frequency, reminder_start_date, custom_message, notification_preference, is_recurring)
      VALUES (@reminder_id, @bill_id, @reminder_frequency, @reminder_start_date, @custom_message, @notification_preference, @is_recurring)
    `).run(reminder);
  }
  return findByBillId(reminder.bill_id);
}

function findByBillId(billId) {
  return db.prepare('SELECT * FROM reminder_settings WHERE bill_id = ?').get(billId);
}

module.exports = { upsert, findByBillId };
