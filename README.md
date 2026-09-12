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
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store token — required in production (see Deploy checklist); unset locally, falls back to disk |
| `GOTENBERG_URL` / `GOTENBERG_BASIC_AUTH_USER` / `GOTENBERG_BASIC_AUTH_PASSWORD` | Optional — Excel→PDF conversion (`infra/gotenberg/README.md`); unset disables Convert to PDF with a clear message |

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

1. Create a Vercel Blob store (Storage tab → Create Database → Blob) and connect it to the project — this sets `BLOB_READ_WRITE_TOKEN` for you in every environment (Production/Preview/Development) it's linked to. Required: without it, uploads and generated documents would try to write to local disk, which doesn't persist on Vercel's serverless functions.
2. Set the remaining env vars on Vercel for each environment you deploy (pooled + direct DB URLs, Auth, cron secret, Resend optional, Gotenberg optional)
3. `prisma migrate deploy` on release (never `migrate reset` / `db push --force-reset` against a real database)
4. Confirm `vercel.json` cron hits `/api/cron/overdue` with `CRON_SECRET`
5. Google OAuth redirect URIs for the deployed domain(s) — a Preview deployment's URL changes per-commit unless you assign a stable branch domain, so use that for testing sign-in rather than the raw preview URL
6. Optional at launch: stand up Gotenberg (`infra/gotenberg/README.md`) for Excel→PDF conversion — everything else works without it
