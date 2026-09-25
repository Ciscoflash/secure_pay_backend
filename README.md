# SecurePay Backend

REST API for the SecurePay cross-border shipping and payments platform. Built
with Node.js, TypeScript, Express and MongoDB (Mongoose).

## Features

- Email + password registration with 5-digit email verification
- JWT authentication and role-based authorization (admin)
- Wallet with simulated funding and transaction history
- Shipment creation, live delivery-cost quotes, instant pay-as-you-create, and
  pay-later for unpaid shipments
- Shipment tracking history with status timeline and journey stops
- Dashboard analytics (overview + growth series)
- Notifications with read/unread state

## Prerequisites

- Node.js 18+ (developed against v22)
- MongoDB (local `mongodb://localhost:27017` or an Atlas cluster)

## Getting started

```sh
npm install
cp .env.example .env    # then set MONGODB_URI, JWT_SECRET, RESEND_API_KEY
npm run dev             # starts the API on http://localhost:5001
```

## Scripts

| Script              | Description                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Run with hot reload (`tsx watch server.ts`) |
| `npm run build`     | Compile TypeScript to `dist/`              |
| `npm start`         | Run the compiled server (`node dist/server.js`) |
| `npm run seed`      | Seed the database                          |
| `npm run seed:reset`| Reset and reseed                           |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |

## Environment variables

See `.env.example` for full notes.

| Variable                | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `PORT`                  | API port (default `5001`)                            |
| `MONGODB_URI`           | MongoDB connection string                            |
| `JWT_SECRET`            | Secret used to sign auth tokens                      |
| `JWT_EXPIRES_IN`        | Token lifetime (e.g. `7d`)                           |
| `RESEND_API_KEY`        | Resend API key for verification emails               |
| `EMAIL_FROM`            | Sender address for verification emails               |
| `FRONTEND_URL`          | Allowed frontend origin (CORS / links)               |
| `APP_TIMEZONE`          | Dashboard period boundaries (default `Africa/Lagos`) |
| `NODE_ENV`              | `production` disables demo defaults (see below)      |
| `EXPOSE_VERIFICATION_CODE` | When `true`, show the verification code in responses |

## Demo behaviors

Two behaviors keep the demo self-service so a reviewer can complete the whole
flow without a working email provider or real payment rails.

### 1. Verification codes are exposed

Outside production (or when `EXPOSE_VERIFICATION_CODE=true`), the API returns
the 5-digit verification code in the `register` and `resend-verification`
responses so the app can show it on the verify-email screen.

Email delivery failures never block account creation. If the email provider
misbehaves (for example Resend's test mode only lets you send to your own
address), the service logs a warning, keeps the account, and exposes the in-app
code so verification can still complete. Set `NODE_ENV=production` with
`EXPOSE_VERIFICATION_CODE=false` to go back to email-only delivery.

### 2. Wallet funding is simulated

`POST /wallet/fund` credits the wallet immediately with no payment provider.
**This must be gated behind a real payment webhook before going live.**

## Monetary units

All amounts are stored in **kobo** (1/100 of a Naira) as integers. Example:
`850000` kobo `= N8,500`. The frontend formats these for display.

## API overview

All routes are mounted under `/api`. Responses follow a common envelope
(`backend/utils/SuccessResponse`): `{ success, message, statusCode, data, meta }`.
Errors are handled uniformly by the error middleware (see
`backend/utils/AppError` and `backend/middleware/errorHandler.ts`).

Authenticated routes expect `Authorization: Bearer <token>`. Role-protected
routes (`/users`) require an admin user.

| Method | Path                        | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/auth/register`            | Create an account                    |
| POST   | `/auth/login`               | Sign in                              |
| POST   | `/auth/verify-email`        | Verify email with the 5-digit code   |
| POST   | `/auth/resend-verification` | Issue a fresh code (authenticated)   |
| GET    | `/auth/me`                  | Current profile (authenticated)      |
| GET    | `/dashboard/overview`       | Dashboard summary                    |
| GET    | `/dashboard/growth`         | Growth series data                   |
| GET    | `/shipments`                | List, filter, search, paginate       |
| POST   | `/shipments/estimate`       | Quote delivery cost for a route      |
| POST   | `/shipments`                | Create a shipment                    |
| GET    | `/shipments/:id`            | Shipment details + tracking events   |
| POST   | `/shipments/:id/pay`        | Pay for an unpaid shipment           |
| GET    | `/wallet`                   | Wallet with transaction history      |
| POST   | `/wallet/fund`              | Simulated deposit (demo)             |
| GET    | `/notifications`            | Notifications                        |
| POST   | `/notifications/read-all`   | Mark all as read                     |
| POST   | `/notifications/:id/read`   | Mark one as read                     |
| GET/POST/PUT/DELETE | `/users...`    | User administration (admin role only) |

### Shipment pricing

Delivery cost depends on the destination country from Nigeria:

| Destination | Cost (kobo) |
| ----------- | ----------- |
| Nigeria (local) | 850,000 |
| Ghana          | 4,500,000 |
| United Kingdom | 8,500,000 |
| United States / Canada | 9,500,000 |
| United Arab Emirates | 9,000,000 |
| Other         | 8,000,000 |

A route must start or end in Nigeria; the shipment direction (export/import/
local) is derived server-side from the pickup and delivery locations
(`backend/services/shipmentService.ts`).

## Project structure

```
config/        app config, env helpers, DB connection
controllers/   request handlers
middleware/    auth (JWT), role authorization, error handling
models/        Mongoose schemas (User, Shipment, Transaction, Notification)
routes/        Express routers
services/      business logic (auth, mail, shipments, wallet, dashboard)
seed/          database seed scripts
utils/         envelope, errors, serializers, token helpers
```

## Tests

There is no automated test framework yet; the API is verified with
`npm run typecheck` and manual/scripted end-to-end checks (`curl`, temporary
driver scripts) against the running dev server.

## Deployment

```sh
npm run build
NODE_ENV=production npm start
```

Point `MONGODB_URI` at your MongoDB instance. See `.env.example` for
production notes.