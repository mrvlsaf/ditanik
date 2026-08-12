# Ditanik

Internal admin app for **LPO management**, **fabric inventory**, **manufacturer fabric ledgers**, and **consumption rates**.

## Current position

**Phases 0–5 complete** — greenfield LPO + Fabric product with deadline email cron and GitHub Actions CI.

See [docs/ROADMAP.md](docs/ROADMAP.md) for product rules.  
See [docs/QA.md](docs/QA.md) for the end-to-end manual test plan.

## Breaking change note

Dev databases were reset for the greenfield schema. Do not expect old LPO/fabric rows to migrate.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) → redirects to `/login` until signed in.

If Neon was sleeping, open the Neon dashboard once, then:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

## Environment (`.env`)

Copy from `.env.example` and fill in:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon **pooled** URL (`…-pooler…`) for the app + longer timeouts |
| `DIRECT_URL` | Neon **direct** URL (no `-pooler`) for `prisma migrate` |
| `AUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `ALLOWED_EMAILS` | Comma-separated emails that may sign in |
| `CRON_SECRET` | Bearer token for `/api/cron/overdue` |
| `OVERDUE_NOTIFY_EMAIL` | Optional overdue recipient |
| `RESEND_API_KEY` | Optional — without it, deadline emails dry-run |
| `RESEND_FROM_EMAIL` | Optional Resend from address |

## Scripts

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm db:deploy
pnpm db:generate
```

### Deadline cron (local dry-run)

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/overdue
```

## Nav

| Route | Purpose |
|-------|---------|
| `/lpo` | LPO dashboard + create |
| `/invoices` | Supplier invoices (filter by supplier/month) |
| `/manufacturers` | Registry + fabric ledger per manufacturer |
| `/consumption` | Garment meters table |
| `/notifications` | Due reminders inbox |
| `/help` | In-app knowledge base & user flows |

## Deploy checklist

1. Set all env vars on Vercel (pooled + direct DB URLs, Auth, cron secret, Resend optional)
2. `prisma migrate deploy` on release
3. Confirm `vercel.json` cron hits `/api/cron/overdue` with `CRON_SECRET`
4. Swap local `uploads/` for cloud blob before relying on production file storage
5. Google OAuth redirect URIs for the production domain
