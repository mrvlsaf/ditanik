# Ditanik

Internal admin app for **LPO**, **Fabric Inventory**, and **Invoices**.

## Step 12–13 (current)

Review PDF upload + Mark as Reviewed gate, and Mark as Delivered.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) → redirects to `/login` until signed in.

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

> If you see `Can't reach database server` on `findUnique` / `findMany`, Neon is sleeping or the wrong host is used. Use the **pooler** URL in `DATABASE_URL` with `connect_timeout=30`, then restart `pnpm dev`.

### Google OAuth setup

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project  
2. **APIs & Services → OAuth consent screen** (External is fine for testing)  
3. **Credentials → Create OAuth client ID → Web application**  
4. Authorized JavaScript origins: `http://localhost:3001`  
5. Authorized redirect URIs: `http://localhost:3001/api/auth/callback/google`  
6. Paste Client ID / Secret into `.env`  
7. Put your Gmail in `ALLOWED_EMAILS`

## Database

```bash
pnpm db:deploy
pnpm db:generate
pnpm db:studio
```

## Folder map

| Path | Purpose |
|------|---------|
| `auth.ts` | Auth.js config (Google + allowlist + user upsert) |
| `middleware.ts` | Redirects guests to `/login` |
| `app/login/` | Sign-in page |
| `lib/db.ts` | Prisma client |
| `prisma/` | Schema + migrations |
