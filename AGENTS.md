# AGENTS.md — nexbaron-api

Backend API for Nexbaron (two divisions: **Digital** — website/growth plans; **Print** — commercial printing). Powers both `nexbaron-web` (public site) and `nexbaron-crm` (staff CRM). Sibling repos: `/Users/nishantkumar/dev/nexbaron-web`, `/Users/nishantkumar/dev/nexbaron-crm`.

## Commands

```bash
npm run dev                 # tsx watch src/index.ts (port 3001)
npm run build               # tsc -> dist/
npm start                   # node dist/index.js
npx tsx scripts/seed-admin.ts            # seed/reset owner accounts (digital-owner@ / print-owner@nexbaron.com; pw = SEED_ADMIN_PASSWORD || admin12345)
npx tsx scripts/migrate-to-division-dbs.ts  # one-off legacy DB migration
```

No tests, no linter config. Verify with `npm run build` (tsc strict).

## Architecture

- **Express 4 + TypeScript 5 (commonjs) + Mongoose 8**, deployed as separate Digital and Print **Vercel** serverless runtimes (`api/index.ts` wraps the same Express app from `src/express-app.ts`; the runtime brand is fixed by `BRAND`). Also runs long-lived via `src/index.ts`.
- **One MongoDB database per runtime** (`nexbaron-digital`, `nexbaron-print`). `src/utils/database.ts` selects the runtime's connection (`DATABASE_URL_DIGITAL`/`DATABASE_URL_PRINT`, fallback `DATABASE_URL`); `src/models/registry.ts` registers only that brand. **All data access is runtime-scoped; never trust client-supplied division for data access.**
- Middleware order matters in `src/express-app.ts`: the Digital Razorpay webhook router mounts at `/digital` **before** `express.json()` because it needs the raw body (`express.raw`).

### Layout

```
api/index.ts            Vercel serverless entry (memoized DB promise)
src/index.ts            long-running server entry
src/express-app.ts      app factory: middleware chain + route mounts
src/models/             division-agnostic model factories + registry
src/features/
  shared/middleware/    customer JWT (hand-rolled HS256) + requireAuth
  admin/                staff auth (bcrypt + cookie JWTs, hashed rotating refresh tokens), staff CRUD
  digital/auth/         customer OTP + Google sign-in
  digital/catalog/      plan catalog (single source of truth for pricing)
  digital/onboarding/   per-user checkout drafts
  digital/payments/     Razorpay create-order/verify/webhook + GST invoice email
  print/                print catalog + estimate computation
  leads/                public contact forms -> Lead (runtime-scoped digital/print routes)
  orders/               admin order/payment management
  quotes/               quote request pipeline (customer submit + admin price/send)
scripts/                seed-admin, division DB migration
```

### Auth (two independent systems)

- **Customer**: Bearer JWT, hand-rolled HMAC-SHA256 in `src/features/shared/middleware/jwt.ts` (no jsonwebtoken lib). Production requires an explicit `JWT_SECRET`; issued by OTP verify and Google sign-in. `requireAuth` sets `req.userId`/`req.division`.
- **Staff/admin**: bcrypt passwords; hand-rolled admin JWTs (access 15min cookie, refresh 30d cookie, httpOnly, sameSite lax). Cookie names include the runtime brand. Refresh tokens are stored sha256-hashed with rotation. Roles `owner > admin > staff`; `requireAdmin`/`requireRole`/`requireDivision` middleware; all admin data access is runtime-scoped.

### Integrations (all via global `fetch`, no SDKs)

- **Razorpay** (`digital/payments/services/razorpay.ts`): order creation, HMAC signature checks, webhook. Development fallback returns fake `order_dev_*` ids; production requires valid credentials and webhook secret.
- **Resend** for invoice/quote emails (skipped with warning if `RESEND_API_KEY` unset). **PDFKit** for quote PDFs. WhatsApp = `wa.me` links only (no provider).
- **OTP delivery** (`otp-service.ts`) hashes OTPs, applies TTL/throttling, and returns `devCode` only outside production when explicitly enabled.

### Conventions

- Response envelope everywhere: `{ success: boolean, message?, ...payload }`; 201 for creates.
- Controllers are `async (req, res)` with full try/catch → 500 JSON; never throw to Express (exception: admin auth routes use `next(err)` + global error handler).
- Files kebab-case with layer suffixes: `*-routes.ts`, `*-controller.ts`, `*-service.ts`, `*.model.ts`. Named exports; `I`-prefixed Mongoose doc interfaces; no semicolons, single quotes, 2-space indent.
- Server-side price computation from catalogs — never trust client prices. Division forced server-side on public endpoints. Escape user input before `$or` regexes.
- Logging: winston (`logger.error('<fn> failed', error)`); console-only on Vercel.
- All imports relative (tsconfig declares `@/*` alias but it is unused).

### Env (see `.env.example`)

`PORT`, `FRONTEND_URL`, `CORS_ORIGINS`, `DATABASE_URL`(+`_DIGITAL`/`_PRINT`), `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`, `OTP_DEV_MODE`, `OTP_TTL_MS`, `RAZORPAY_KEY_ID`/`_KEY_SECRET`/`_WEBHOOK_SECRET`, `RESEND_API_KEY`, `INVOICE_FROM_EMAIL`, `BILLING_GSTIN`. Undocumented: `ADMIN_JWT_SECRET`, `LOG_LEVEL`, `SEED_ADMIN_PASSWORD`, `QUOTE_WHATSAPP_ENABLED`, `QUOTE_FROM_EMAIL_DIGITAL`/`_PRINT`.

### Gotchas

- Production checklist: `OTP_DEV_MODE=false`, real Razorpay keys and webhook secret, `RESEND_API_KEY`, real `BILLING_GSTIN`, and strong `JWT_SECRET`/`ADMIN_JWT_SECRET` values.
- `POST /<brand>/auth/google` verifies the raw Google credential server-side; it does not trust client-supplied identity fields.
- Customer auth, drafts, payments, quotes, leads, and admin routes are available only under the runtime's canonical `/<brand>/*` path.

### Git

Branch `main`; commits are feature-sized imperative messages ("Add X").

### Brand Logo

The official Nexbaron logo is an NX monogram. Source SVG at `nexbaron-web/public/icon.svg`.

**Rules for any server-generated HTML/PDF:**
- Always use the NX monogram, never a plain letter or text-based logo.
- Digital division: teal gradient (`#14b8a6` → `#06b6d4`).
- Print division: amber gradient (`#f59e0b` → `#f97316`).
- See `src/quotes/services/quote-service.ts` for the canonical implementation.

The official logo is `public/icon.svg` — NX monogram in a rounded square with gradient border.
Corporate: teal→amber gradient. Digital: teal icon on teal gradient. Print: amber icon on amber gradient.

**Rules:**

- Every email template, PDF, or external asset must use this logo.
- `components/brand/brand-mark.tsx` is the canonical React component.
- Never create a different logo or text-based fallback.

## Design Standards

You are a world-class UX/UI designer. Every interface you build must reflect this.

### Layout
- Never stack everything in a single column. Use proper grid layouts (2-col, 3-col, 5-col depending on content).
- Primary content on the left/wider column, secondary/summary on the right/skinnier column.
- Page headers are clean: title + one-line description, no clutter.

### Surfaces
- Cards use `rounded-2xl` (not `rounded-lg`), `bg-neutral-surface`, `border border-border`.
- Tables and lists use `rounded-2xl overflow-hidden` with `divide-y divide-border/60`.
- Empty states: centred icon + title + description, never bare text.

### Typography
- Headings: `text-2xl font-bold text-heading`.
- Body: `text-sm text-body` or `text-heading`.
- Muted/secondary: `text-xs text-muted`.
- Never use font sizes below `text-[10px]` for badges/labels; `text-xs` for descriptions.

### Spacing
- Section gap: `space-y-6` or `space-y-8`.
- Card padding: `p-6` inside, `px-5 py-3.5` for rows.
- Grid gap: `gap-6` for main sections, `gap-4` for stat cards.

### States
- Loading: centred spinner (`animate-spin`), never bare "Loading..." text.
- Empty: rounded-2xl card with icon + message.
- Error: bordered card with message + retry.

### Buttons
- Primary: `bg-accent text-white rounded-xl font-bold hover:opacity-90`.
- Outline/secondary: `border border-muted rounded-xl`.
- Never use raw `<button>` without these classes.

### Animations
- Hover cards: `hover:border-accent/30 transition-colors`.
- Buttons: `transition-opacity` or `transition-all`.
- Progress bars: `transition-all duration-700`.
- List items: `hover:bg-neutral-bg transition-colors`.

### Forms
- Inputs always: `px-3 py-2.5 bg-neutral-bg border border-border rounded-xl text-sm text-heading placeholder:text-muted focus:outline-none focus:border-accent/50`.
- Labels: `text-xs text-muted` above the input.
- Modals: centred with `bg-black/50 backdrop-blur-sm` overlay.

### Detail panels (CRM)
- Width: `w-96`, pinned right (`border-l border-border`), `bg-neutral-bg`.
- Close button: `X` icon top-right, `w-8 h-8 rounded-lg hover:bg-neutral-surface`.
- Sections separated by `border-t border-border pt-4`.

### App Shell Layout

For CRM and Hub: **sidebar + topbar fixed, content scrolls independently.**

- Root wrapper: `h-screen flex bg-neutral-bg overflow-hidden` (NOT `min-h-screen`).
- Sidebar: fixed left, `h-full`.
- Main area: `flex-1 flex flex-col overflow-hidden`.
- Content: `flex-1 overflow-auto` — this is the ONLY element that scrolls.
- Topbar: inside main, fixed height, never scrolls.

This is the Stripe / Linear / Vercel pattern.

### Clickable Elements

Every interactive element must have a cursor pointer:

- `<button>` — natively gets `cursor: pointer`, no extra class needed.
- `<a href="...">` — natively gets `cursor: pointer`, no extra class needed.
- `<div onClick={...}>`, `<span onClick={...}>`, `<tr onClick={...}>` — must include `cursor-pointer`.
- Any element with `onClick` that is not a native `<button>` or `<a>` — must include `cursor-pointer`.
- `hover:` transitions on clickable rows: `hover:bg-neutral-bg cursor-pointer transition-colors`.

### Data Source of Truth

- **API is the single source of truth for ALL data.** Never hardcode prices, plan names, service lists, statuses, milestones, or any business data in the frontend.
- When building a feature that spans repos: always start with the API. Define the data model, the endpoint response shape, and the status flow FIRST. Then update all clients (web, hub, crm) to consume that data as-is.
- Frontend must display exactly what the API returns. No client-side mapping, no hardcoded defaults for business data, no fallback arrays for plan services or pricing.
- If a feature needs new data from the API, add the endpoint/field to the API first, then update all clients to use it.
- NEVER hardcode plan names ("Launch"), service lists, prices, progress percentages, or milestone labels. Read everything from the API response.
