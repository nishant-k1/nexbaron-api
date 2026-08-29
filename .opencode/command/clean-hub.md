---
description: Clean all dummy Hub data from Atlas — keeps staff/services
---

Run the Hub dummy data cleaner. Execute:

```bash
npx tsx scripts/clean-hub.ts
```

from `nexbaron-api` (uses `DATABASE_URL` from `.env`). It deletes all Hub-visible collections (`leads`, `orders`, `users`, `quotes`, `proposals`, `invoices`, `accounts`, `packages`, `chatmessages`, `conversations`, etc.) but keeps `staff` and `services` so logins still work. Report the counts deleted.
