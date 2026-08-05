# Nexbaron API

Express, TypeScript, Mongoose API deployed as two strictly separated brand runtimes.

`api.nexbaron.com` is a routing-only gateway. The only public brand paths are
`/digital/*` and `/print/*`. The gateway stores no database or provider credentials.

## Runtime Contract

Every process must set `BRAND=digital` or `BRAND=print`. It opens one MongoDB connection, registers only that brand in the model registry, and mounts only `/<BRAND>` routes. Requests for the other brand and unbranded or `/api/*` paths return 404.

Use two deployments with independent environment variables and databases:

```text
Digital: BRAND=digital  DATABASE_URL=<digital database>
Print:   BRAND=print    DATABASE_URL=<print database>
```

`DATABASE_URL_DIGITAL` and `DATABASE_URL_PRINT` are optional conveniences for a shared local env file and take precedence over `DATABASE_URL` for their matching runtime. A runtime never opens or falls back to the other brand database.

Set independent `JWT_SECRET` and `ADMIN_JWT_SECRET` values in each deployment. A shared local env file may instead use the exact `JWT_SECRET_DIGITAL`/`JWT_SECRET_PRINT` and `ADMIN_JWT_SECRET_DIGITAL`/`ADMIN_JWT_SECRET_PRINT` names. Customer and admin tokens are rejected unless their signed division matches the runtime brand.

Production requires explicit, non-placeholder customer and admin JWT secrets. JWT verification accepts only HS256 JWT headers, validates required claims and timestamps, and uses timing-safe signature comparison. Customer bearer tokens are accepted only through the `Authorization` header.

## Routes

Both brands expose:

- `/<brand>/auth`
- `/<brand>/contact`
- `/<brand>/quotes`
- `/<brand>/admin/auth`
- `/<brand>/admin/leads`
- `/<brand>/admin/orders`
- `/<brand>/admin/quotes`

Digital additionally exposes `/catalog`, `/drafts`, `/payments`, and the Razorpay webhook under `/digital`. Print additionally exposes `/catalog` and `/status` under `/print`.

Admin cookies include the brand in their names, allowing simultaneous Digital and Print sessions in one browser.

## Configuration

Copy `.env.example` and configure each deployment separately. Digital Razorpay values (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`), billing values (`INVOICE_FROM_EMAIL`, `BILLING_GSTIN`), and email provider credentials must belong to that deployment. Configure quote sender identities with `QUOTE_FROM_EMAIL_DIGITAL` or `QUOTE_FROM_EMAIL_PRINT` as appropriate.

Google sign-in requires this deployment's `GOOGLE_CLIENT_ID` (or exact brand-suffixed equivalent). The API verifies the raw `credential` with Google's tokeninfo endpoint and does not trust client-supplied identity fields.

Production email OTP requires `OTP_HASH_SECRET`, `RESEND_API_KEY`, and `OTP_FROM_EMAIL`. OTP records contain only HMAC hashes, expire through a MongoDB TTL index, and are request-throttled. `devCode` is available only outside production when `OTP_DEV_MODE` is not `false`. Phone OTP returns 503 until an SMS provider is implemented.

Production Digital deployments require real Razorpay credentials and `RAZORPAY_WEBHOOK_SECRET`; fake orders and signature skipping are development-only. Webhooks fail closed and process only `payment.captured` events.

## Development

```bash
npm install
BRAND=digital PORT=3001 npm run dev
BRAND=print PORT=3002 npm run dev
npm run build
```

Seed the owner in one brand database at a time:

```bash
BRAND=digital npx tsx scripts/seed-admin.ts
BRAND=print npx tsx scripts/seed-admin.ts
```

`SEED_ADMIN_PASSWORD` is required and must contain at least 12 characters. The
seed script never prints the password.

Run the legacy split migration as a dry run first. It requires explicit source
and target URLs and refuses to copy documents whose brand cannot be proven:

```bash
LEGACY_DATABASE_URL=... DIGITAL_DATABASE_URL=... PRINT_DATABASE_URL=... \
  npx tsx scripts/migrate-to-division-dbs.ts
MIGRATION_APPLY=true LEGACY_DATABASE_URL=... DIGITAL_DATABASE_URL=... \
  PRINT_DATABASE_URL=... npx tsx scripts/migrate-to-division-dbs.ts
```

The API defaults to port 3001. `GET /health` is an unbranded process health check.
