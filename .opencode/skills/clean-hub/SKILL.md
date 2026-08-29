---
name: clean-hub
description: Clean all dummy Hub data from Atlas nexbaron DB — deletes leads, orders, users, quotes, proposals, invoices, accounts, packages, chat etc. but keeps staff and services. Use ONLY when user wants to wipe dev test data in Hub/CRM.
---

# Clean Hub

Deletes all dummy customer data from the Hub-visible collections in the Atlas `nexbaron` database.

**Keeps:** `staff`, `staffs`, `services` (login + catalog)
**Deletes:** `leads`, `orders`, `users`, `quotes`, `proposals`, `invoices`, `accounts`, `packages`, `packageservices`, `onboardingdrafts`, `chatmessages`, `conversations`, `invoicecounters`, `sequences`, `otps`, `reminders`, etc.

Run:
```bash
npx tsx scripts/clean-hub.ts
```
from `nexbaron-api`. Requires `DATABASE_URL` in `.env` (Atlas).
