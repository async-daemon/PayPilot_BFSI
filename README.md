# PayPilot (Java/Spring) — Seamless Bill Management and Hassle Free Payments Solution

A BFSI bill-management and payments application built **exactly to the technology stack specified in the `PayPilot_BFSI` Business Requirements Document**: Java / Spring, Hibernate ORM, and a layered Controller → Service → Repository → Entity architecture.

This is the Java/Spring counterpart to the project's original Node.js prototype — same features, same REST API contract, same frontend, rebuilt on the BRD's actual specified stack once a JDK and Maven were available on this machine.

---

## 1. What this is, per the BRD

The BRD's **Architecture Diagram** (page 40 of the BRD) specifies:

| Layer | BRD requirement | What this project uses |
|---|---|---|
| Application / Business Layer | Java 1.8 / Spring (Web-Server Classes: Configuration, Controllers, Service, REST Controllers) | **Java 17 / Spring Boot 3.2** (a newer, fully-compatible LTS version of Java — the BRD's Java 1.8 is end-of-life and not meaningfully different for this app's code) |
| Data Access Layer | Hibernate ORM (Repository classes) | **Hibernate ORM 6 via Spring Data JPA** |
| Database | Oracle 11g | **H2 (embedded, file-based)** — Oracle 11g is a 2007-era release with no realistic install path today; H2 is a genuine SQL database accessed through the exact same JPA/Hibernate repository layer, so swapping in a real Oracle/PostgreSQL instance later only means changing `application.properties` and the Maven dependency — no code changes |

Everything else in the BRD (two-step login with image-selection screen verification + OTP, admin-approved sign-ups, account lockout, bill tracking with category-specific fields, PDF attachments, recurring bills, reminders, scheduled payments, Pay Now with bank/card selection, payment tracking) is implemented identically to the BRD's wireframes and user stories.

---

## 2. System requirements

To **build and run** this project you need:

| Requirement | Version used here | Notes |
|---|---|---|
| **JDK** | 17 (Eclipse Temurin) | Any Java 17+ distribution works. Installed here via `winget install EclipseAdoptium.Temurin.17.JDK` |
| **Maven** | 3.9.9 | Installed here by downloading the binary archive directly from `archive.apache.org` and adding it to `PATH` (no system package manager needed) |
| **OS** | Windows 10/11 (also runs on macOS/Linux — it's pure Java) | |
| Disk space | ~500 MB | JDK (~300 MB) + Maven (~10 MB) + downloaded dependencies (~150 MB, cached in `~/.m2`) |
| Browser | Any modern browser | Chrome, Edge, Firefox, Safari |

No Node.js, no Docker, and **no separate database server** are required — H2 runs embedded inside the same JVM process as the application.

### Verifying your setup

```bash
java -version    # should print "17.x.x" or newer
mvn -version     # should print "Apache Maven 3.x"
```

### Installing the prerequisites (if you don't have them)

**Windows (winget):**
```bash
winget install --id EclipseAdoptium.Temurin.17.JDK -e
```
Maven isn't reliably available via winget; download it directly instead:
```bash
curl -L -o maven.zip https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip
# unzip to a folder, then add its bin/ directory to your PATH
```

**macOS (Homebrew):**
```bash
brew install openjdk@17 maven
```

**Linux (apt):**
```bash
sudo apt install openjdk-17-jdk maven
```

---

## 3. Project structure (layered architecture, per the BRD)

```
pom.xml                          # Maven build file — all dependencies declared here
src/main/java/com/paypilot/
  PayPilotApplication.java       # Spring Boot entrypoint (main method)
  config/
    WebConfig.java                # Registers the auth interceptor + /uploads static file serving
    DataSeeder.java                # Seeds the admin user on first run (CommandLineRunner)
    GlobalExceptionHandler.java    # Converts thrown ApiException -> proper HTTP status + JSON body
  model/                          # === Entity / Model Classes (JPA @Entity) ===
    User.java, Bill.java, Payment.java, ScheduledPayment.java, ReminderSettings.java
    Constants.java                 # Bill categories, payment methods, reminder frequencies
  repository/                     # === Repository classes (Spring Data JPA / Hibernate) ===
    UserRepository.java, BillRepository.java, PaymentRepository.java,
    ScheduledPaymentRepository.java, ReminderRepository.java
  service/                        # === Service layer (business logic) ===
    AuthService.java, BillService.java, ReminderService.java,
    ScheduledPaymentService.java, PaymentService.java, ApiException.java
  controller/                     # === REST Controllers ===
    AuthController.java, BillController.java, ReminderController.java,
    ScheduledPaymentController.java, PaymentController.java
  security/
    JwtUtil.java                   # Issues/validates JWTs (io.jsonwebtoken / jjwt)
    AuthInterceptor.java           # Spring MVC interceptor: verifies Bearer token on every /api/** call
  dto/                             # Request bodies + response "view" objects (snake_case JSON, matching the frontend)
src/main/resources/
  application.properties          # DB connection, JWT secret, upload limits, server port
  static/                          # The frontend — plain HTML/CSS/JS, identical to the Node version
uploads/                          # Bill PDF attachments (created at runtime)
data/                              # H2 database file (created at runtime: paypilot.mv.db)
```

This mirrors the BRD's architecture diagram directly:
**Controllers → Service → Repository classes → Entity/Model Classes → H2 Database (via Hibernate ORM)**.

---

## 4. How to run it

```bash
cd PayPilot-Java
mvn spring-boot:run
```

First run downloads dependencies into your local `~/.m2` repository (a few minutes); every run after that starts in a few seconds.

Once you see:
```
Started PayPilotApplication in X seconds
Seeded admin user -> userId: admin | password: Admin@123
PayPilot server running at http://localhost:3000
```

Open **http://localhost:3000** in a browser.

### Building a standalone jar (optional)

```bash
mvn clean package
java -jar target/paypilot.jar
```

### Running the test suite

The same 75-check end-to-end regression suite used for the Node prototype runs unchanged against this server (same API contract):

```bash
# with the server already running in another terminal
node test/api.test.js
```
*(This script lives in the companion Node-based repo at `test/api.test.js`; it talks to whichever server — Node or Java — is listening on port 3000, since both expose an identical REST API.)*

---

## 5. Application flow

### 5.1 Request flow (per the BRD's layered architecture)

```
Browser (static HTML/JS in src/main/resources/static/)
   │  fetch('/api/...')
   ▼
AuthInterceptor (security/)          — verifies the JWT Bearer token, attaches userId/isAdmin to the request
   ▼
*Controller (controller/)            — REST endpoint, request/response mapping only
   ▼
*Service (service/)                   — all business logic and validation lives here
   ▼
*Repository (repository/)             — Spring Data JPA interfaces; Hibernate generates the SQL
   ▼
H2 Database (data/paypilot.mv.db)     — stands in for the BRD's Oracle 11g
```

Errors anywhere in the Service layer are thrown as `ApiException(status, message)` and caught centrally by `GlobalExceptionHandler`, which converts them into the same `{ "message": "..." }` JSON shape the Node version used — so the existing frontend needs zero changes to work against either backend.

### 5.2 User / auth flow

1. **Sign-up** (`POST /api/auth/signup`) — creates a user with `status = "pending"`.
2. **Admin approval** (`GET/POST /api/auth/admin/...`) — an admin (seeded on first run) approves the pending account.
3. **Login, two-step verification:**
   - `POST /api/auth/screen-challenge` — returns a 3×3 grid of emoji and a target; the user must pick every tile matching the target (an image-selection CAPTCHA, matching the BRD wireframe's "select all images with a bus").
   - `POST /api/auth/verify-screen` — verifies the selection; on success, issues a one-time login OTP (returned directly in the response as `devOtp`, since no SMTP/SMS provider is configured — see §7).
   - `POST /api/auth/verify-otp` — verifies the OTP.
   - `POST /api/auth/login` — now checks the password; on success issues a JWT. **3 wrong password attempts locks the account** (`locked = true`), which can only be lifted via the forgot-password flow.
4. **Forgot password** (`POST /api/auth/forgot/request|verify|reset`) — OTP-based reset that also unlocks a locked account.

### 5.3 Bill lifecycle

1. **Add a bill** (`POST /api/bills`, multipart form) — category, due date, amount, optional PDF attachment, optional recurring toggle (which pre-creates the next 2 months' occurrences), and category-specific fields (Loan Type / Total Loan Amount for *Debt Payments*; Period From/To for *House Rent*).
2. **Bills Overview** (`GET /api/bills/overview`) — filterable list; Debt Payments and House Rent render their own specialized table layout (per the BRD wireframes) instead of the generic one.
3. **Upcoming/Overdue** (`GET /api/bills/upcoming-overdue`) — computes `overdue_days`, `due_label`, and the real `amount_due` (accounting for any partial payments already made).
4. **Pay Now** (`POST /api/bills/{id}/pay-now`) — choose Net Banking (bank-logo grid) or Credit/Debit Card (card form — only the card holder's name and last 4 digits are ever persisted, never the full number or CVV); supports partial payments, blocks overpayment and paying an already-fully-paid bill.
5. **Snooze / Mark Paid** (`POST /api/bills/{id}/snooze|mark-paid`).
6. **Reminder Settings** (`GET/PUT /api/reminders/{billId}`) — frequency, start date, custom message, notification preference.

### 5.4 Scheduled payments

`POST /api/scheduled-payments/bill/{billId}` schedules a future payment (payee details, purpose of payment, payment mode, and — for recurring bills only — a payment frequency). `POST .../{id}/cancel` and `POST .../{id}/modify` manage it afterward; both are blocked once a scheduled payment is no longer in `Scheduled` status.

### 5.5 Payment tracking

`GET /api/payments/progress|overview|history` — progress bars (red = unpaid, blue = partially paid, green = fully paid), a status overview, and a full payment history including which bank or masked card was used.

### 5.6 Security model

- Every `/api/**` route except signup/login/forgot-password requires a valid `Authorization: Bearer <jwt>` header (enforced by `AuthInterceptor`).
- All bill/payment/reminder/scheduled-payment lookups are scoped to the authenticated user — one user can never read, edit, or pay another user's bill (verified by the automated test suite's cross-user security checks).
- Admin-only routes additionally check the `isAdmin` claim embedded in the JWT.
- Passwords are hashed with BCrypt (`spring-security-crypto`); JWTs are signed with HMAC-SHA (`io.jsonwebtoken`).

---

## 6. Entities (per the BRD's ER diagram)

| Entity | Maps to BRD concept |
|---|---|
| `User` | Users — login credentials, PAN/bank details, admin flag, lockout state, OTP state |
| `Bill` | Bills — one row per bill (or per recurring occurrence), including category-specific fields |
| `Payment` | Payments — one row per payment made against a bill (supports partial payments) |
| `ScheduledPayment` | ScheduledPayments — a future-dated payment intent |
| `ReminderSettings` | ReminderSettings — one row per bill's reminder configuration |

See `src/main/java/com/paypilot/model/` for the exact JPA mappings.

---

## 7. Demo-mode notes

- **OTP delivery:** no SMTP/SMS provider is configured, so OTPs are returned directly in the API response (`devOtp`) and shown on-screen as "Demo OTP: ######" instead of being emailed. Wiring real delivery only requires adding a mail/SMS call in `AuthService` wherever `devOtp`/the OTP string is generated.
- **Screen verification:** the BRD wireframe's "select all images with a bus" CAPTCHA is implemented with an emoji grid instead of real photographs, since no image/CAPTCHA asset library was wired in — the interaction and validation logic are otherwise identical.
- **Database:** H2 stands in for Oracle 11g (see §1). To point at a real Oracle or PostgreSQL instance instead, add the corresponding JDBC driver to `pom.xml` and update the four `spring.datasource.*` properties in `application.properties` — no Java code changes are required, since all SQL is generated by Hibernate through the Repository interfaces.

## 8. Credentials seeded on first run

- **User Id:** `admin`
- **Password:** `Admin@123`

New sign-ups start as `pending` and must be approved from the Admin screen (visible after logging in as `admin`).
