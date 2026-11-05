# Ditanik — End-to-end QA plan

A detailed manual walkthrough to test the whole product.  
Edit this file as flows change. Use the [Change requests](#change-requests-edit-freely) section for tweaks you want.

**Last updated:** 2026-09-20  
**Primary environment:** local app on [http://localhost:3001](http://localhost:3001) + Neon Postgres  
**Related docs:** [FLOW.md](./FLOW.md), [DECISIONS.md](./DECISIONS.md), [ROADMAP.md](./ROADMAP.md)

---

## How to use this doc

1. Start at **Prep** every session (Neon awake, migrations, env, `pnpm dev`).
2. Follow sections **in order**. Later steps reuse manufacturers, rates, LPOs, and fabric batches from earlier ones.
3. For each step: do the **Action**, then check **Pass if**.
4. When something fails, add a row under [Bug log](#bug-log).
5. When you change product behavior, update this file plus `FLOW.md` / `DECISIONS.md`.

**Suggested full pass:** 90–120 minutes.  
**Minimum smoke path:** see [Minimum 60–90 min path](#minimum-60–90-min-path).

---

## Known limits (do not treat as product bugs)

| Limit | What you’ll see | Why |
|-------|-----------------|-----|
| Local file storage (dev only) | PDFs work on your machine under `uploads/` when `BLOB_READ_WRITE_TOKEN` is unset | Production uses Vercel Blob (durable); local dev falls back to disk automatically |
| No Resend key | Cron returns `dryRun: true`; no real inbox email | Without `RESEND_API_KEY`, notifications are recorded as dry-run |
| Neon sleep | First request after idle may error / “waking up” | Free Neon suspends; retry after wake |
| Cron schedule | Locally nothing runs until you `curl` | Vercel Cron only hits Production on a schedule |

---

## Prep

### 1. Wake the database

1. Open the Neon dashboard.
2. Open this project’s database so it is not suspended.
3. Wait until the project shows as active.

If you skip this, `prisma migrate deploy` and the app will fail with connection errors (`P1001`).

### 2. Confirm environment variables

Open `.env` (copy from `.env.example` if needed). You need:

| Variable | Required? | What it does |
|----------|-----------|--------------|
| `DATABASE_URL` | Yes | Pooled Neon URL the **Next.js app** uses for queries |
| `DIRECT_URL` | Yes | Non-pooler URL **Prisma migrate** uses |
| `AUTH_SECRET` | Yes | Signs Auth.js session cookies |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `ALLOWED_EMAILS` | Yes | Comma-separated emails allowed to sign in |
| `CRON_SECRET` | Yes | Bearer token required by `/api/cron/overdue` |
| `OVERDUE_NOTIFY_EMAIL` | Optional | Who receives notification emails; if empty, first `ALLOWED_EMAILS` entry is used |
| `APP_BASE_URL` | Recommended | Public origin for deep links in emails, e.g. `http://localhost:3001` |
| `RESEND_API_KEY` | Optional | If set, cron sends real emails; if missing, dry-run |
| `RESEND_FROM_EMAIL` | Optional | From address for Resend |

For local deep-link testing, set:

```bash
APP_BASE_URL=http://localhost:3001
```

### 3. Install dependencies (first time / after pull)

```bash
pnpm install
```

**What this does:** installs Node packages from the lockfile into `node_modules`.

### 4. Apply database migrations

```bash
pnpm exec prisma migrate deploy
```

**What this does:** applies any pending SQL migrations in `prisma/migrations/` to Neon (including the `notifications` table if not applied yet). Safe for shared/dev DBs; does not reset data.

If the schema is badly out of date and you **intend** to wipe local/dev data:

```bash
pnpm exec prisma migrate reset
```

**What this does:** drops the DB, re-applies all migrations, runs seed if configured. **Destructive** — only with consent.

### 5. Generate Prisma Client

```bash
pnpm exec prisma generate
```

Or:

```bash
pnpm db:generate
```

**What this does:** regenerates the TypeScript Prisma client from `prisma/schema.prisma` so the app knows about models like `Notification`.

### 6. Run automated checks before manual QA

```bash
pnpm test
```

**What this does:** runs Vitest unit tests (domain rules: LPO dates/status, fabric meters, notification rules, etc.).

```bash
pnpm exec tsc --noEmit
```

**What this does:** TypeScript typecheck without emitting files. Catches broken imports/types.

```bash
pnpm lint
```

**What this does:** ESLint across the repo.

All three should be green before you spend time on UI. If they fail, fix or log bugs first.

### 7. Start the app

```bash
pnpm dev
```

**What this does:** starts Next.js on **port 3001** (`next dev --port 3001`).

Open [http://localhost:3001](http://localhost:3001).  
Unauthenticated users should bounce to `/login`.

### 8. Assets to have ready

Prepare small PDFs on disk:

| File | Use for |
|------|---------|
| PDF A | LPO original document on create |
| PDF B | Production file when assigning manufacturer |
| PDF C | Fabric supplier invoice on receive |
| PDF D (optional) | Extra LPO / second invoice |

### 9. Data you will create while testing

Keep a scratch pad:

| Entity | Example name | Purpose |
|--------|--------------|---------|
| Consumption rate | Shirt / 1.5 m | LPO fabric requirement |
| Manufacturer | Test Garments | Assign + issue fabric |
| LPO A | Full happy path | Create → assign → complete |
| LPO B | Left Under Review | Cron / bell / deep links |
| Fabric batches | From receive form | Stock, issue, return, ledger |

---

## 1. Auth + app shell

**Goal:** Only allowlisted users get in; chrome shows sidebar nav + top header with page title and notification bell.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 1.1 | With app running, open `/lpo` in a private window (logged out) | Redirect to `/login` (often with `callbackUrl`) |
| [ ] | 1.2 | Click Google sign-in with an email in `ALLOWED_EMAILS` | Session starts; land on `/lpo` |
| [ ] | 1.3 | (If you can) try a Google account **not** in allowlist | Sign-in blocked / no app access |
| [ ] | 1.4 | Look at layout on `/lpo` | **Sidebar:** Ditanik brand + nav + sign out. **Top header:** page title (“LPO”) + description on the left; **bell** on the right |
| [ ] | 1.5 | Click each nav item: LPO, Fabric, Invoices, Manufacturers, Consumption, Notifications | Each page loads; header title/description update for that page |
| [ ] | 1.6 | Resize to mobile width | Hamburger opens drawer; title + bell stay in header |
| [ ] | 1.7 | Sign out from sidebar/drawer | Session ends; visiting `/lpo` sends you to login again |

**Notes / tweaks**

- …

---

## 2. Consumption rates

**Goal:** Create garment → meters rates used later on LPO fabric requirements.

1. Go to **Consumption** (`/consumption`).
2. Create a rate, e.g. garment name `Shirt`, meters `1.5`.
3. Confirm it appears in the list.
4. Deactivate one rate (if UI allows) and note that it must **not** appear in the LPO requirement picker later.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 2.1 | Create active rate | Listed and usable later |
| [ ] | 2.2 | Deactivate a rate | Not offered on LPO requirement form |

**Notes / tweaks**

- …

---

## 3. Manufacturers

**Goal:** Have at least one manufacturer for assign + fabric issue.

1. Go to **Manufacturers** (`/manufacturers`).
2. Create `Test Garments` (or similar).
3. Open its detail page — empty ledger is OK.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 3.1 | Create manufacturer | Appears in list |
| [ ] | 3.2 | Open `/manufacturers/[id]` | Page loads |

**Notes / tweaks**

- …

---

## 4. LPO happy path (LPO A)

**Goal:** Full lifecycle: receive → under review → date changes → fabric requirement → assign → complete.

### 4a. Create

1. Go to `/lpo`.
2. Fill Create LPO:
   - LPO number (unique)
   - Nickname
   - Client name
   - Received date = **today**
   - Upload PDF A
3. Submit.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 4.1 | Create LPO A with PDF | Dashboard row appears; status **Under Review** (auto after create) |
| [ ] | 4.2 | Open LPO A detail | Header shows LPO number; dates default to received **+2** (assignment), **+12** (production), **+15** (client delivery), Asia/Dubai EOD |
| [ ] | 4.3 | View and Download original PDF | Viewer opens; download works |

### 4b. Date changes

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 4.4 | Extend **assignment** date with a too-short reason | Rejected (min reason length) |
| [ ] | 4.5 | Extend assignment with a valid reason | New date saved; change history row |
| [ ] | 4.6 | Extend **production deadline** with reason | Updates + history |
| [ ] | 4.7 | Extend **client delivery** with **empty** reason | Allowed (reason optional for client delivery) |

### 4c. Fabric requirement on LPO

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 4.8 | Add requirement using consumption rate + quantity | Expected meters = qty × rate |

### 4d. Assign + complete

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 4.9 | Assign **existing** manufacturer + upload production PDF B | Status → **Assigned to manufacturer**; production file visible |
| [ ] | 4.10 | View production PDF | Works |
| [ ] | 4.11 | Mark client delivery completed | Status → **Client delivery completed**; `clientDeliveredAt` shown |

### 4e. Negatives

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 4.n1 | Try create LPO without PDF | Blocked / validation error |
| [ ] | 4.n2 | On already-assigned LPO, look for assign UI | Assign form hidden |
| [ ] | 4.n3 | Before assign, look for complete control | Complete not available |

**Notes / tweaks**

- …

---

## 5. Extra LPO + new manufacturer (LPO B)

**Goal:** Data for notifications; also verify “register new manufacturer” on assign.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 5.1 | Create **LPO B**; do **not** assign | Stays **Under Review** |
| [ ] | 5.2 | On another under-review LPO (or before completing A), assign via **Register new manufacturer** + production PDF | New manufacturer appears under `/manufacturers` and LPO is assigned |

Keep LPO B under review for section 8.

**Notes / tweaks**

- …

---

## 6. Fabric inventory

**Goal:** Receive (invoice required), issue, return, stock math.

1. Go to `/fabric`.
2. Receive fabric:
   - Supplier name
   - One or more batches with meters
   - **Invoice PDF C required**
3. Confirm stock table increases.
4. Issue some meters to **Test Garments** (optionally link an LPO).
5. Try issuing more than available stock — must fail.
6. Return some meters from that manufacturer.
7. Check the movement list: RECEIVED / ISSUED / RETURNED in order.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 6.1 | Receive with invoice + batches | Stock up; invoice record exists |
| [ ] | 6.2 | Receive without invoice PDF | Blocked |
| [ ] | 6.3 | Issue to manufacturer | Stock down; ISSUED movement |
| [ ] | 6.4 | Over-issue | Error / blocked |
| [ ] | 6.5 | Return meters | Stock up; RETURNED movement |
| [ ] | 6.6 | Review movement ledger | Append-only; quantities match |

**Notes / tweaks**

- …

---

## 7. Invoices + manufacturer ledger + variance

### Invoices

1. Go to `/invoices`.
2. Filter by supplier, month, and search text.
3. View/Download invoice PDF for a row you received.

### Ledger + variance

1. Open `/manufacturers/[id]` for Test Garments.
2. Issue fabric to the same manufacturer for **two different LPOs** (and once with **no LPO**).
3. Confirm the ledger shows **separate sections per LPO** (expected fabric, expected balance, batch rows) plus **Additional fabric (no LPO)** — meters must not be summed into one pool.
4. If LPO fabric requirements exist, check per-LPO “additional fabric required”: `max(0, required − expected on hand for that LPO)`.
5. When returning fabric issued for an LPO, pick the **same Related LPO** so that LPO’s balance decreases.
6. Submit a variance (expected vs actual + reason enum).

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 7.1 | Invoice filters + PDF | Correct subset; files open |
| [ ] | 7.2 | Manufacturer ledger by LPO | LPO A / LPO B / no-LPO are separate |
| [ ] | 7.3 | Requirement vs stock callout | Plausible **per LPO** |
| [ ] | 7.4 | Return with LPO | Correct LPO bucket decreases |
| [ ] | 7.5 | Create variance | Row saved |

**Notes / tweaks**

- …

---

## 8. Company Profile, document generation, Convert to PDF & PDF prefill

**Goal:** One-time company setup, then generate all four client-facing documents from an LPO, optionally convert to PDF, and confirm PDF auto-fill on Create LPO behaves correctly on both a matching and a non-matching PDF.

### 8a. Company Profile (one-time)

1. Open Company Profile settings.
2. Fill in legal name, TRN, address, phone, website, logo, default terms/footer text.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 8.1 | Fill and save Company Profile | Saved; appears automatically on every generated document's header |

### 8b. Generate documents (use LPO A from section 4)

1. Open LPO A's detail page.
2. Generate a Quotation, then a Quote, then a Tax Invoice, then a Delivery Note.
3. For each: confirm line items/quantities, confirm the auto-suggested document number, generate.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 8.2 | Generate each of the four document types | Each downloads as a correctly filled `.xlsx`; document number follows `{Site}-{TYPE}-{DDMMYYYY}-{Seq}` |
| [ ] | 8.3 | Edit LPO A's line items after generating a document | Already-generated document is unchanged on re-download (snapshot, not live data) |
| [ ] | 8.4 | Check document history on the LPO | All four generated documents listed, re-downloadable |

### 8c. Convert to PDF

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 8.5 | Convert to PDF with Gotenberg **not** configured | Clear "PDF conversion isn't set up yet" message; the `.xlsx` download still works |
| [ ] | 8.6 | Convert to PDF once Gotenberg is deployed (`infra/gotenberg/README.md`), including the standalone `/documents/convert` upload-and-convert page | Real PDF downloads in both cases |

### 8d. LPO PDF prefill

1. On Create LPO, upload a real client LPO PDF and click "Prefill from this PDF" before filling anything manually.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 8.7 | Prefill from a text-based LPO PDF matching the calibrated layout (e.g. `tests/fixtures/JOHNLPO.pdf`) | Header fields (order number, dates, addresses, TRN) fill in; message states how many fields were filled |
| [ ] | 8.8 | Review every prefilled field, including line items, before submitting | Nothing generates or saves until you submit — prefill is review-then-submit, never automatic |
| [ ] | 8.9 | Prefill from a scanned/image-only PDF, or a differently-formatted client PDF | Fails back cleanly ("Couldn't find fields this parser recognizes..." or similar) — form stays usable manually; LPO creation is never blocked |

**Notes / tweaks**

- …

---

## 9. Notifications (cron + bell + deep links)

**Goal:** Daily review reminders + overdue alerts create `Notification` rows, power the bell, and deep-link into LPO actions.

### 9a. Trigger the cron locally

In a **second terminal** (leave `pnpm dev` running):

```bash
# Load CRON_SECRET from .env if your shell doesn’t already have it
export $(grep -v '^#' .env | xargs)   # optional helper; or paste the secret manually

curl -s -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3001/api/cron/overdue
```

**What this does:**  
Calls the same route Vercel Cron would hit. The route checks `Authorization: Bearer CRON_SECRET`, then runs `processDueNotifications`, which:

- Creates `REVIEW_PENDING` once per under-review LPO per Dubai business day  
- Creates one-shot overdue rows when dates are past (`ASSIGNMENT_OVERDUE`, `PRODUCTION_OVERDUE`, `CLIENT_DELIVERY_OVERDUE`)  
- Sends email or marks dry-run  
- Returns JSON like `{ ok: true, dryRun, reviewPendingCreated, … }`

### 9b. Auth on cron

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 9.1 | `curl` **without** header or with wrong secret | HTTP `401` |
| [ ] | 9.2 | `curl` with correct `CRON_SECRET` | HTTP 200; `ok: true`; review rows for LPO B |

### 9c. Idempotency

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 9.3 | Run the same `curl` again the same Dubai day | No duplicate `REVIEW_PENDING` for same LPO/day; response `skipped` increases |

### 9d. In-app inbox

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 9.4 | Click the header bell | Unread badge and recent items (or link to all) |
| [ ] | 9.5 | Click a notification | Navigates to `/lpo/{id}?action=assign\|dates\|complete` and scrolls/highlights the target section |
| [ ] | 9.6 | Open `/notifications`; use Open / Mark read / Mark all read | Unread state clears; bell count updates after refresh |

### 9e. Deep links without the bell

Manually open (replace `{id}`):

- `http://localhost:3001/lpo/{id}?action=assign` → assignment block  
- `http://localhost:3001/lpo/{id}?action=dates` → dates block  
- `http://localhost:3001/lpo/{id}?action=complete` → complete control (when available)

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 9.7 | All three query actions | Correct section focused |

### 9f. Optional — force overdue types

On an **assigned** LPO (not completed):

1. Change production deadline to **yesterday** (reason required).
2. Change client delivery to **yesterday** (reason optional).
3. Re-run the cron `curl`.
4. Expect `PRODUCTION_OVERDUE` and/or `CLIENT_DELIVERY_OVERDUE` notifications once per `dueAt`.
5. Run cron again — those should not duplicate for the same due timestamp.

| Done | Step | Action | Pass if |
|------|------|--------|---------|
| [ ] | 9.o1–9.o4 | Force dates past + cron twice | One-shot overdues; second run skips duplicates |

**Notes / tweaks**

- …

---

## 10. Automated gates (run again after manual QA)

Re-run after your session so regressions from env/data aren’t confused with code breaks:

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm lint
```

| Done | Command | What it does | Pass if |
|------|---------|--------------|---------|
| [ ] | `pnpm test` | Unit tests | All green |
| [ ] | `pnpm exec tsc --noEmit` | Typecheck | Clean |
| [ ] | `pnpm lint` | ESLint | Clean (or only known accepted issues) |

---

## 11. Deployed smoke (optional)

Only after Vercel env vars + `prisma migrate deploy` on that database.

| Done | Step | Action | Pass if / notes |
|------|------|--------|-----------------|
| [ ] | 11.1 | Google OAuth on prod domain | Login works; redirect URIs include prod URL |
| [ ] | 11.2 | Create LPO + upload PDF | Persists via Vercel Blob — confirm the file is still downloadable after a few minutes (no instance-recycle loss) |
| [ ] | 11.3 | Confirm Vercel Cron + `CRON_SECRET` | `/api/cron/overdue` runs on schedule |
| [ ] | 11.4 | `APP_BASE_URL` = prod URL | Notification links point at production |

---

## Minimum 60–90 min path

If you cannot do the full matrix, do this:

1. **Prep** — migrate, generate, `pnpm test`, `pnpm dev`
2. **Auth + header** — login; confirm title + bell placement
3. **Consumption** — one rate
4. **LPO A** — create → check dates → assign existing manufacturer → complete
5. **Documents** — generate one document from LPO A; confirm it downloads (Convert to PDF only if Gotenberg is deployed)
6. **Fabric** — receive with invoice → issue → check stock
7. **Invoices** — find the invoice; open PDF
8. **LPO B** — create and leave under review
9. **Cron** — `curl` overdue route → bell → open deep link → mark read
10. **Gates** — `pnpm test` + `tsc` again

---

## Definition of done

A test pass is complete when all of these are true:

- [ ] LPO happy path works (create → assign → complete)
- [ ] Company Profile set; all four document types generate and download correctly
- [ ] Convert to PDF degrades cleanly without Gotenberg, and works once Gotenberg is deployed
- [ ] LPO PDF prefill fills expected fields on a matching-layout PDF and fails back cleanly on a scan/mismatched layout, without ever blocking manual entry
- [ ] Fabric receive / issue / return works
- [ ] Invoices filters + PDF open
- [ ] Manufacturer ledger / variance works
- [ ] Cron → notification inbox → deep link works
- [ ] Automated gates green

---

## Useful command cheat sheet

| Command | What it does |
|---------|--------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Dev server on port **3001** |
| `pnpm test` | Vitest unit tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | TypeScript check |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:deploy` | `prisma migrate deploy` (apply migrations) |
| `pnpm db:migrate` | `prisma migrate dev` (create/apply in dev) |
| `pnpm exec prisma studio` | GUI browser for Neon tables |
| `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/overdue` | Manually run due-notification job |

### Inspect notifications in DB (optional)

```bash
pnpm exec prisma studio
```

**What this does:** opens Prisma Studio so you can browse `notifications`, `lpos`, `fabric_*` tables and confirm rows after cron.

---

## Bug log

| Date | Area | Steps to reproduce | Expected | Actual | Severity | Fixed? |
|------|------|--------------------|----------|--------|----------|--------|
| | | | | | | |

---

## Change requests (edit freely)

Product/UX tweaks you want before or during testing.

### Wanted changes

1. …
2. …
3. …

### Out of scope / later

- Cloud blob storage for PDFs on Vercel  
- …

### Related docs to update after changes

- [ ] `docs/FLOW.md`
- [ ] `docs/DECISIONS.md` (new D-0XX if a rule changes)
- [ ] `README.md`
- [ ] This file (`docs/QA.md`)
