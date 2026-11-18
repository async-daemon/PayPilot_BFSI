# PayPilot — Seamless Bill Management and Hassle Free Payments Solution

A BFSI bill-management and payments app built from the `PayPilot_BFSI_BRD` business requirements document, covering user management, bill tracking, reminders, scheduled payments and payment tracking.

## Stack

The BRD specifies Java 1.8/Spring + Hibernate + Oracle 11g. This machine had no JDK/Maven installed, so the same **layered architecture** (controllers → services → repositories → entities) was implemented with an equivalent, runnable stack:

- **Backend:** Node.js + Express
- **Database:** SQLite (file-based, via `better-sqlite3`) — a drop-in substitute for Oracle for this layered design; swapping in a real RDBMS only touches `src/config/db.js` and the repository SQL.
- **Auth:** bcrypt password hashing, JWT sessions, two-step login (screen verification + OTP), 3-strikes account lockout
- **Frontend:** Vanilla HTML/CSS/JS pages matching the BRD wireframes

## Project layout

```
src/
  config/db.js            # DB connection + schema (Users, Bills, Payments, ScheduledPayments, ReminderSettings)
  models/constants.js      # Bill categories, statuses, reminder frequencies, payment methods
  repositories/             # Data access layer (raw SQL via better-sqlite3)
  services/                 # Business logic layer
  controllers/              # REST controllers (Express routers)
  middleware/authMiddleware.js
  routes/index.js
  server.js                 # App entrypoint
public/                     # Frontend (login, signup, dashboard, manage bills, schedule payment, track payments, admin)
uploads/                    # Bill PDF attachments
data/                       # SQLite database file (created on first run)
```

## Running it

```bash
npm install
npm start
```

Then open http://localhost:3000 in a browser.

An admin account is seeded automatically:

- **User Id:** `admin`
- **Password:** `Admin@123`

New sign-ups are created with `pending` status and must be approved from the Admin screen (visible after logging in as `admin`) before they can log in — matching the BRD's "Application Admin maintains the sign-up details" stakeholder requirement.

## Testing

A 72-check end-to-end regression suite (`test/api.test.js`) covers the full auth lifecycle (signup, admin approval, image-captcha + OTP login, 3-strike lockout, forgot password), bill CRUD across every category, category-specific fields, Pay Now (bank and card), scheduling, reminders, track-payments, cross-user data isolation, and attachment validation.

```bash
npm start      # in one terminal
npm test       # in another, once the server is up
```

It creates its own uniquely-named test user each run, so it's safe to run repeatedly against the same database without resetting it first.

## Demo-mode notes

- **OTP delivery:** there is no configured SMTP/SMS provider, so OTPs (login 2FA and forgot-password) are returned directly in the API response and shown on-screen as "Demo OTP: ######", instead of being emailed. Wiring real delivery only requires adding a mailer call in `src/services/authService.js` where `devOtp` is generated.
- **Screen verification:** matches the BRD wireframe's image-selection CAPTCHA ("select all images with a bus") using an emoji grid instead of real photos — pick all tiles matching the shown target, then Verify.
- **Card payments:** the "Pay with card" form never sends the full card number or CVV to the server — only the cardholder name and last 4 digits are persisted, for display in Payment History.

## Features implemented (per BRD)

- **User management:** sign-up with PAN/bank details, admin approval, two-step login (image-selection screen verification + OTP), forgot password, account lockout after 3 failed attempts
- **Manage Bills:** add/edit/delete bills with category, due date, amount, reminder frequency, PDF attachment, recurring toggle; category-specific fields (Loan Type/Total Loan Amount for Debt Payments, Rent Period From/To for House Rent); Bills Overview with category/date/status filters and category-specific table layouts; Upcoming/Overdue bills with Pay Now; Snooze or Mark Paid
- **Pay Now:** select Net Banking (bank-logo grid: SBI, Bank of Baroda, Union Bank, HDFC, Axis, Kotak, ICICI, plus "more »") or Credit/Debit Card (card details form), partial/full payment with overpayment protection
- **Reminder Settings:** per-bill frequency, start date, custom message, notification preference, recurring
- **Schedule Payment:** schedule a bill payment with purpose of payment, payee details, payment mode, frequency (recurring bills); Cancel/Modify scheduled payments
- **Track Payments:** Payment Progress (red/blue/green progress bar), Payment Overview, Payment History (with bank/card detail)

## Entities (per BRD ER diagram)

`Users`, `Bills`, `Payments`, `ScheduledPayments`, `ReminderSettings` — see `src/config/db.js` for the schema.
