const BILL_CATEGORIES = [
  'Debt Payments',
  'House Rent',
  'Groceries',
  'Internet Charges',
  'Retirement Charges',
  'Cell phone charges',
];

const BILL_STATUS = {
  NOT_PAID: 'Not Paid',
  PARTIALLY_PAID: 'Partially Paid',
  PAID: 'Paid',
};

const REMINDER_FREQUENCIES = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly'];

const PAYMENT_METHODS = ['Net Banking', 'Credit Card', 'Debit Card'];

const BANKING_PARTNERS = ['HDFC', 'ICICI', 'SBI', 'Axis Bank', 'Kotak', 'Union Bank'];

module.exports = {
  BILL_CATEGORIES,
  BILL_STATUS,
  REMINDER_FREQUENCIES,
  PAYMENT_METHODS,
  BANKING_PARTNERS,
};
