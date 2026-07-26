# Ditanik

Internal admin app for **LPO**, **Fabric Inventory**, and **Invoices**.

## Step 3 (current)

Prisma + Neon Postgres `User` model. App shell from Step 2 still in place.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001).

## Database (Neon)

1. Create a project at [neon.tech](https://neon.tech)
2. Put the connection string in `.env` as `DATABASE_URL`
3. Run:
   ```bash
   pnpm db:deploy
   pnpm db:generate
   ```

Useful scripts: `pnpm db:studio` (browse data), `pnpm db:migrate` (new migrations while developing).

## Folder map

| Path | Purpose |
|------|---------|
| `app/(app)/` | App routes + shell layout |
| `components/app-shell/` | Shared sidebar / drawer / page container |
| `lib/db.ts` | Prisma client singleton |
| `prisma/` | Schema + migrations |
| `modules/` | Feature business logic (later steps) |
