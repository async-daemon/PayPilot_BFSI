const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', '..', 'data', 'paypilot.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  pan_details TEXT,
  bank_account_number TEXT,
  ifsc_code TEXT,
  banking_partner TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked INTEGER NOT NULL DEFAULT 0,
  reset_otp TEXT,
  reset_otp_expires INTEGER,
  login_otp TEXT,
  login_otp_expires INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  bill_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  bill_name TEXT NOT NULL,
  bill_category TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount REAL NOT NULL,
  reminder_frequency TEXT,
  attachment TEXT,
  notes TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Not Paid',
  snoozed_until TEXT,
  loan_type TEXT,
  total_loan_amount REAL,
  period_from TEXT,
  period_to TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  payment_id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  payment_date TEXT NOT NULL,
  payment_mode TEXT,
  payer_account_number TEXT,
  payment_institution TEXT,
  card_holder_name TEXT,
  card_last4 TEXT,
  amount_paid REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Paid',
  FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scheduled_payments (
  scheduled_payment_id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  payee_name TEXT,
  payee_address TEXT,
  payee_bank_details TEXT,
  payment_frequency TEXT,
  payment_mode TEXT,
  payer_account_number TEXT,
  purpose_of_payment TEXT,
  scheduled_date TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminder_settings (
  reminder_id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL,
  reminder_frequency TEXT NOT NULL,
  reminder_start_date TEXT,
  custom_message TEXT,
  notification_preference TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (bill_id) REFERENCES bills(bill_id) ON DELETE CASCADE
);
`);

// Defensive migration for databases created before these columns existed.
const migrations = [
  'ALTER TABLE bills ADD COLUMN loan_type TEXT',
  'ALTER TABLE bills ADD COLUMN total_loan_amount REAL',
  'ALTER TABLE bills ADD COLUMN period_from TEXT',
  'ALTER TABLE bills ADD COLUMN period_to TEXT',
  'ALTER TABLE payments ADD COLUMN payment_institution TEXT',
  'ALTER TABLE payments ADD COLUMN card_holder_name TEXT',
  'ALTER TABLE payments ADD COLUMN card_last4 TEXT',
  'ALTER TABLE scheduled_payments ADD COLUMN purpose_of_payment TEXT',
];
for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch (err) {
    if (!/duplicate column/i.test(err.message)) throw err;
  }
}

module.exports = db;
