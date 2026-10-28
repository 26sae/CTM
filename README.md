# Binangonan Banking Corporation

A fictional retail-banking web application built for a **cybersecurity attack simulation**. The app demonstrates authentication weaknesses, credential stuffing, brute force, and request flooding. User-supplied values in SQL queries use bound parameters.

> This is not a real bank. Never enter real personal, financial, or login information.

## Stack

- **Frontend:** React 19, Vite 7, custom CSS
- **Backend:** Express 4, MySQL (`mysql2`)
- **Attack client:** Node.js + `axios`
- **Seed script:** `seed.js`

## Features

### Customer
- Login and registration
- Dashboard with combined and per-account balances
- Account details and statement history
- Transaction search by reference number, description, or category
- Profile editing, password change, notification preferences
- Admin users can also open the back office from their profile

### Admin back office
- Overview statistics
- Create, edit, and delete customer accounts
- Create, edit, and delete customer profiles
- Open an initial account while creating a customer
- View security logs for successful/failed logins, registrations, and admin actions
- Filter and paginate logs

## Defensive controls

The API includes dependency-free baseline protections for this training application:

- Login attempts are limited to 10 per IP/email key every 15 minutes; other API traffic is limited to 120 requests per IP per minute.
- JSON and form request bodies are size-limited, transaction results are capped at 100 rows, and search input is bounded.
- Passwords use Node.js `scrypt`; legacy seeded plaintext passwords are upgraded after a successful login and are never returned to the client.
- Responses include CSP, `X-Content-Type-Options`, clickjacking, referrer, and permissions-policy headers.
- CORS only allows `ALLOWED_ORIGINS` (default: localhost Vite/API origins). Set this environment variable to a comma-separated allowlist in deployment.
- React renders user-controlled profile values as text, so stored names are escaped rather than interpreted as HTML.

The admin endpoints still require proper authentication and authorization before any non-demo deployment. The in-memory rate limiter is intended for a single-instance simulation; use a shared store (such as Redis) behind a reverse proxy for multiple instances and add infrastructure-level DDoS protection.

## Database setup

Create a dedicated dummy database in MySQL Workbench, for example:

```sql
CREATE DATABASE binangonan_bank;
```

Create a `.env` file in the project root:

```env
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQLUSER=root
MYSQLPASSWORD=your_password
MYSQLDATABASE=binangonan_bank

# Optional
PORT=5000
VITE_API_BASE_URL=http://localhost:5000
```

`server/database.js` also accepts the deployment-style variables `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQL_SSL_CA`, and `MYSQL_SSL_CA_PATH`.

## Install and seed

```bash
npm install
npm run seed
```

`seed.js` automatically creates the `users`, `accounts`, `transactions`, and `logs` tables, then truncates and repopulates them. Run it only against a dummy database.

### Seeded credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@binangonanbank.test` | `Admin@123` |
| Customer | `customer001@binangonanbank.test` | `password123` |
| Customer | `customer002@binangonanbank.test` | `Password1` |
| Customer | `customer003@binangonanbank.test` | `Welcome123` |
| Customer | `customer004@binangonanbank.test` | `P@ssw0rd` |
| Customer | `customer005@binangonanbank.test` | `letmein123` |
| Customer | `customer006@binangonanbank.test` | `Bank1234` |

Customer emails run from `customer001@binangonanbank.test` through `customer030@binangonanbank.test`. Passwords cycle through the six weak passwords above.

The seed also creates 5,000 transactions and 160 sample security log entries.

## Run

Start the API:

```bash
npm start
```

Start the Vite frontend in a second terminal:

```bash
npm run dev
```

The frontend defaults to `http://localhost:5000`. Set `VITE_API_BASE_URL` if the API uses another host.

Build the production frontend:

```bash
npm run build
```

The Express server serves the generated `dist/` directory.

## Attack simulation

`attack.js` defaults to `http://localhost:5000`. Override it with `TARGET`.

### Login brute force

```bash
npm run attack
# or
node attack.js --mode=brute
```

Tries the seeded customer emails against the seeded weak-password list and prints recovered credentials.

### Request flood

```bash
node attack.js --mode=flood
```

Keeps the original burst-flood behavior, targeting the vulnerable transaction search endpoint.

### Everything

```bash
node attack.js --mode=all
```

### Configuration

```bash
TARGET=http://localhost:5000 \
DURATION_MS=10000 \
CONCURRENCY=10 \
REQUESTS_PER_TICK=50 \
BURST_INTERVAL_MS=10 \
node attack.js --mode=all
```

Every failed and successful login is written to the `logs` table and appears in the admin back office under **Security logs**.

## Important note

This repository is a training target. Do not deploy it publicly with real data, and only run the attack script against systems you own or are explicitly authorized to test.
