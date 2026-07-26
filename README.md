# Ditanik

Internal admin app for **LPO**, **Fabric Inventory**, and **Invoices**.

## Step 2 (current)

Responsive app shell: desktop sidebar, mobile/tablet drawer, placeholder pages for LPO / Fabric / Invoices.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) (redirects to `/lpo`).

> Port **3001** avoids clashes with other apps on 3000.

## Folder map (high level)

| Path | Purpose |
|------|---------|
| `app/(app)/` | Authenticated app routes + shell layout |
| `components/app-shell/` | Shared sidebar / drawer / page container |
| `modules/` | Feature business logic (later steps) |
| `lib/` | Shared helpers (navigation, db, auth, …) |
| `prisma/` | Database schema (Step 3+) |
| `tests/` | Unit and e2e tests |
