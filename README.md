# Fishonitory

Fishonitory is a web application for managing a fish farm or aquarium business. This guide is for students who want to run, understand, or extend the project.

## What it includes

- **Owner workspace:** business overview, staff, attendance, shifts, payroll, announcements, inventory, tanks, sales, purchases, mortality records, reports, and settings.
- **Master Staff workspace:** point of sale, customer order fulfillment, and selected inventory, tank, announcement, and shift operations for the linked business.
- **Staff access:** attendance and time-clock workflows.
- **Super Admin workspace:** business verification, account and business directories, analytics, platform notices, system logs, and platform settings.
- **Public pages:** business registration, login, password recovery, help, and about/contact.

The client is built with React and Vite. The API uses Node.js, Express, and Mongoose with MongoDB. The client and API are in `client/` and `server/`; the API entry point is `server.js`.

## Requirements

- Node.js and npm
- Access to a MongoDB database for development
- Optional email and Cloudinary accounts for email workflows and image uploads

Use a separate development database with fictional student data. Never test against a live business database.

## Local setup

Run these commands from the `Project/` directory:

```sh
npm install
npm install --prefix server
npm install --prefix client
```

Copy `server/.env.example` to `Project/.env` (the `Project/` directory containing this README), then replace the placeholders with your own development configuration. The server loads this file. Set `CLIENT_URL` to `http://localhost:5173` for local development; it is not currently listed in the example file.

The application needs `MONGODB_URI`, `JWT_SECRET`, and `TOTP_ENCRYPTION_KEY`. Set `NODE_ENV=development` while developing. For email features, configure `BREVO_API_KEY` and a sender address verified with Brevo in `EMAIL_FROM`. The Cloudinary variables are needed for photo uploads. Do not copy real credentials into this README or any source file.

Start both the API and Vite client from `Project/`:

```sh
npm run dev
```

By default, the API runs on port `3000` and Vite on port `5173`. Open `http://localhost:5173`. The client derives its local API host automatically; if needed, set `VITE_API_URL` in a local client environment file to `http://localhost:3000/api`.

For production, configure secrets through the hosting provider's environment settings, set `NODE_ENV=production`, set `CLIENT_URL` to the deployed client origin, and set the client `VITE_API_URL` to the deployed API base URL. Production requires a strong `JWT_SECRET` and `TOTP_ENCRYPTION_KEY`; use HTTPS.

## Important workflows and access

- Business registration uses email verification and may require Super Admin approval before the owner can use the system.
- MFA is required for accounts. Users enroll an authenticator during sign-in and should store recovery codes privately.
- Owner and Master Staff access is scoped to the business linked to their account. Staff accounts have narrower access.
- Sales, purchases, customer orders, and mortality records affect inventory. Use test stock when demonstrating these workflows.
- Customer orders are created from the staff workspace/POS flow; this project does not provide a public customer storefront.

## Checks and project notes

From `Project/`, useful client checks are:

```sh
npm run lint --prefix client
npm run build --prefix client
```

Read `../docs/TESTING.md` for manual workflow checks and `../AUDIT.md` for the latest reviewed findings. The audit records the last known lint errors and a payroll test fixture issue; rerun checks after making changes. The server package's `npm test` script is currently a placeholder, so do not treat it as a passing test suite.

## Protect private data and credentials

- Keep `.env` files, database connection strings, API keys, JWT secrets, encryption keys, passwords, OTPs, and MFA recovery codes private.
- The project `.gitignore` excludes environment files, dependencies, build output, and database backup files. Check `git status` before committing and never force-add a secret or data dump.
- If a secret is exposed, revoke or rotate it promptly. Removing it in a later commit does not remove it from repository history.
- Do not commit database dumps, backups, business permits, real staff/customer records, screenshots containing private data, or exported reports with personal information.
- Use fictional names and contact details in demos, screenshots, seed data, and defense materials. Do not publish real database access or share recovery codes with classmates.
- Store production secrets in the deployment platform's secret manager. Give database users only the access the application needs, and restrict the database to trusted network sources.

## Before extending the project

1. Read the relevant client page, API route, controller, model, and validation middleware before changing a workflow.
2. Keep role checks and business ownership checks on the server; hiding a button in the client is not access control.
3. Validate data on the server and preserve inventory consistency when recording stock changes.
4. Use fictional data and a separate test database, then run the checks and manual scenarios relevant to your change.
5. Update this README and `AUDIT.md` when setup steps, behavior, or known limitations change.
