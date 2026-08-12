# Decisions log

Meaningful product and engineering decisions for Ditanik.  
**Code shows what changed. This file records why** — so we do not re-litigate settled tradeoffs months later.

Format per entry:

- **Date** — when the decision was locked (approx.)
- **Status** — `accepted` | `superseded` | `pending`
- **Context** — what forced a choice
- **Decision** — what we chose
- **Alternatives** — what we rejected
- **Consequences** — what we accept as a result

---

## D-001 — Modular monolith (not Nest/microservices)

| | |
|---|---|
| **Date** | 2026-07 (initial blueprint) / reinforced 2026-08 rewrite |
| **Status** | accepted |

**Context:** Internal admin app; one team; free-tier hosting; need clear boundaries without ops overhead.

**Decision:** One Next.js deployable with layered modules (`domain` → `application` → actions/UI). Same layering Nest would use, without Nest.

**Alternatives:** Nest + separate FE; early microservices; “pages call Prisma everywhere.”

**Consequences:** Easy local run and Vercel deploy. Can extract `modules/lpo` later. Discipline required so UI does not skip layers.

---

## D-002 — Next.js App Router + Server Actions as the mutation API

| | |
|---|---|
| **Date** | 2026-07 / 2026-08 |
| **Status** | accepted |

**Context:** Need authenticated mutations with validation without a separate REST/GraphQL layer.

**Decision:** Server Components load data; `"use server"` actions parse `FormData`, call one application service, `revalidatePath`. Route Handlers only for auth callbacks, file streaming, cron.

**Alternatives:** tRPC; separate Express API; client-only fetches to Route Handlers for everything.

**Consequences:** Fewer moving parts; actions share the Next process and Prisma client. Must raise `serverActions.bodySizeLimit` for PDF uploads (see D-016).

---

## D-003 — Postgres (Neon) + Prisma migrations only

| | |
|---|---|
| **Date** | 2026-07 |
| **Status** | accepted |

**Context:** Relational data (LPO status, ledgers, uniqueness); free serverless Postgres.

**Decision:** Neon + Prisma schema/migrations. App uses **pooled** `DATABASE_URL`; migrate uses **direct** `DIRECT_URL`.

**Alternatives:** SQLite; Mongo; Drizzle; raw SQL.

**Consequences:** Cold starts / sleep on free Neon (retry + friendly error UI). Schema changes need migrations; greenfield reset wiped old data (D-009).

---

## D-004 — Auth.js (NextAuth v5) + Google + email allowlist

| | |
|---|---|
| **Date** | 2026-07 |
| **Status** | accepted |

**Context:** Internal tool; few trusted users; no public signup.

**Decision:** Google OAuth; `ALLOWED_EMAILS` gate in `signIn`; upsert `User` with role `ADMIN`; middleware protects pages/APIs (cron exempt).

**Alternatives:** Credentials/password; Magic link; Clerk; full RBAC from day one.

**Consequences:** Simple and secure enough for v1. Role enum is ready for more roles later; UI does not yet branch on role. Prisma imported dynamically in auth callbacks to keep Edge middleware lean.

---

## D-005 — Zod at every server boundary

| | |
|---|---|
| **Date** | 2026-07 |
| **Status** | accepted |

**Context:** Forms and actions must not trust the client.

**Decision:** Zod schemas under `modules/*/schemas/`; application services parse before domain/DB work.

**Alternatives:** Manual `if` checks only; Yup; TypeBox.

**Consequences:** Single source of validation messages. Zod 4 is in use — stick to its APIs (`z.nativeEnum` / refine patterns already in repo).

---

## D-006 — Domain pure functions; application owns transactions

| | |
|---|---|
| **Date** | 2026-07 / 2026-08 |
| **Status** | accepted |

**Context:** Status rules, date math, and meter math must be unit-testable without Prisma.

**Decision:** `modules/*/domain/*` = pure. `modules/*/application/*` = orchestrate Prisma `$transaction`, file storage, audit logs. Pages/components do not import Prisma when a service exists.

**Alternatives:** Fat Prisma calls in pages; “smart UI” encoding business rules.

**Consequences:** Vitest covers domain heavily. UI can go stale if it duplicates gates — prefer importing domain helpers in client panels (e.g. `canAssignManufacturer`).

---

## D-007 — Hybrid LPO status model

| | |
|---|---|
| **Date** | 2026-08-09 (confirmed) |
| **Status** | accepted (supersedes old PENDING → REVIEWED → DELIVERED) |

**Context:** Product needs Received / Under Review / Assigned / Client Delivery Completed, plus “Production Deadline” as a dashboard phase label—not a fifth DB enum value.

**Decision:**

- Create → `LPO_RECEIVED` then **auto** → `UNDER_REVIEW` in the same transaction.
- Manual: Assign manufacturer (+ production PDF) → `ASSIGNED_TO_MANUFACTURER`.
- Manual: Mark client delivery completed → `CLIENT_DELIVERY_COMPLETED`.
- Dashboard badge for Assigned shows **“Production Deadline”** (phase copy); detail uses “Assigned to Manufacturer.”

**Alternatives:** Fully automatic date-driven statuses; five stored statuses including Production Deadline; all-manual buttons including “Start review.”

**Consequences:** Assignment is available immediately after create (no waiting for +2 days). The +2 day date is a target/deadline, not a gate.

---

## D-008 — Date defaults +2 / +12 / +15 with Asia/Dubai EOD

| | |
|---|---|
| **Date** | 2026-08 rewrite |
| **Status** | accepted |

**Context:** Business operates on Dubai calendar days; need assignment, production, and client delivery timelines from received date.

**Decision:** Store UTC `DateTime`; compute EOD Asia/Dubai via `date-fns` + `date-fns-tz`. Defaults: assignment **+2**, production **+12**, client delivery **+15**. Extensions: reason **required** for assignment & production; **optional** for client delivery.

**Alternatives:** Pure UTC midnights; calendar `@db.Date` only for deadlines; always-required reasons.

**Consequences:** Display helpers must use business TZ for due stamps. Received date alone drives defaults (LPO “document date” field dropped from create UI — stored as received for schema compatibility).

---

## D-009 — Greenfield schema reset (not in-place migrate of old LPO model)

| | |
|---|---|
| **Date** | 2026-08-09 |
| **Status** | accepted |

**Context:** Product rules changed enough that old PENDING/review-PDF/fabric-entry shapes were misleading.

**Decision:** New Prisma models + new migrations; wipe/replace old migrations story; `migrate reset` on Neon during rewrite.

**Alternatives:** Evolve columns in place with data migration scripts.

**Consequences:** Old production/dev rows are gone. Faster correct model. Documented as breaking in ROADMAP/README.

---

## D-010 — File storage adapter; local disk for v1

| | |
|---|---|
| **Date** | 2026-07 / still current 2026-08-11 |
| **Status** | accepted for local; **pending supersession for Vercel prod** |

**Context:** Need PDF upload/view without locking to one cloud vendor.

**Decision:** `FileStorage` interface (`save`/`read`); `localFileStorage` under `uploads/`; `getFileStorage()` single switch point. PDF-only, max 25MB. Authz via `/api/files` key lookup against DB.

**Alternatives:** UploadThing day one; put binaries in Postgres; public S3 URLs.

**Consequences:** Works locally. **Will not work correctly on Vercel** (ephemeral FS). Production requires Blob/S3/R2 behind the same interface before “everything working” deploy.

---

## D-011 — Shared in-app PDF viewer (pdfjs-dist)

| | |
|---|---|
| **Date** | 2026-07 |
| **Status** | accepted |

**Context:** Every upload must be viewable in-app; Download always available.

**Decision:** `DocumentViewer` + `DocumentActions` using pdfjs; worker from CDN; stream bytes from authenticated `/api/files`.

**Alternatives:** Open PDF in new tab only; embed Google Docs viewer; convert to images server-side.

**Consequences:** One UX for LPO original, production file, fabric invoices. Private URLs (`Cache-Control: private, no-store`).

---

## D-012 — Fabric ledger = append-only movements

| | |
|---|---|
| **Date** | 2026-08 |
| **Status** | accepted |

**Context:** Stock and manufacturer balances must be auditable (“bank statement”); no silent edits.

**Decision:** `FabricMovement` rows with signed meters (`RECEIVED` +, `ISSUED`/`USED_FOR_LPO` −, `RETURNED` +). Stock = sum(movements). Corrections = new reversing/adjustment entries, never UPDATE/DELETE history.

**Alternatives:** Mutable `qtyOnHand` column only; soft-delete edits.

**Consequences:** Slightly more write complexity; ledger queries are derivations. Manufacturer expected balance = sent − used − returned per batch.

---

## D-013 — Fabric independent of LPO, with optional links

| | |
|---|---|
| **Date** | 2026-08 |
| **Status** | accepted |

**Context:** Stock ops happen without an LPO; LPO needs expected fabric and issues can reference LPOs.

**Decision:** Separate Fabric receive/issue flows; optional `lpoId` on movements; `LpoFabricRequirement` + consumption rates for expected meters; manufacturer ledger aggregates movements + assigned LPO requirements.

**Alternatives:** Force every fabric receive to an LPO; single mega “order” aggregate.

**Consequences:** Nav modules stay separate (Fabric / Invoices / Manufacturers / Consumption / LPO). Cross-links exist but are not mandatory on every action.

---

## D-014 — Supplier invoice PDF required; Invoices page = filters + recent-first

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Status** | accepted |

**Context:** Need to find invoices by supplier/month; nested Supplier→Month trees get heavy.

**Decision:** Require invoice PDF on fabric receive. `/invoices` = filterable list (supplier, month, ref search), newest `receivedDate` first, View/Download via `DocumentActions`. Optional “group by” deferred.

**Alternatives:** Accordion-only grouping; invoices-by-vendor only (old model).

**Consequences:** Empty PDF rows only for legacy optional uploads (if any). New receives always have a file key.

---

## D-015 — Neon connect retry + stable unavailable error UI

| | |
|---|---|
| **Date** | 2026-08-08 |
| **Status** | accepted |

**Context:** Free Neon sleeps; raw Prisma `P1001` is hostile.

**Decision:** Prisma `$extends` retries unreachable errors (~3 attempts); then throw `DatabaseUnavailableError`; `error.tsx` shows “Database is waking up.”

**Alternatives:** Always-on Neon compute only; no retry; crash to default Next error.

**Consequences:** First request after sleep may be slow but often succeeds. Does not replace waking Neon or fixing wrong URLs.

---

## D-016 — Server Actions body size 25MB

| | |
|---|---|
| **Date** | 2026-08-10 |
| **Status** | accepted |

**Context:** Default Next limit is 1MB; invoice/LPO PDFs exceed it.

**Decision:** `experimental.serverActions.bodySizeLimit: "25mb"` aligned with `pdf-rules` max size.

**Alternatives:** Upload via direct-to-Blob client PUT (bypass actions); lower PDF max to 1MB.

**Consequences:** Larger memory use per action on the server. When moving to Blob, prefer direct upload later if payloads grow further.

---

## D-017 — Tailwind only (no Material/Ant/shadcn churn)

| | |
|---|---|
| **Date** | ROADMAP locked |
| **Status** | accepted |

**Context:** Learning + speed; avoid design-system churn mid-product rewrite.

**Decision:** Shared `AppShell` / `PageContainer`; zinc palette; responsive `sm`/`md`/`lg`.

**Alternatives:** shadcn/ui day one; MUI.

**Consequences:** Consistent enough for internal admin. Visual polish is deferred vs structure.

---

## D-018 — Email: Resend + idempotent deadline notifications

| | |
|---|---|
| **Date** | 2026-08 rewrite (Phase 5) |
| **Status** | superseded by D-021 |

**Context:** Alert when production/client delivery dates pass while still assigned.

**Decision:** Vercel Cron → `/api/cron/overdue` with `Authorization: Bearer CRON_SECRET`. Resend if `RESEND_API_KEY` set; else dry-run rows. Idempotency: `EmailNotification` unique `(lpoId, type, dueAt)` with `PRODUCTION_OVERDUE` / `CLIENT_DELIVERY_OVERDUE`.

**Alternatives:** SES; in-app only; queue worker.

**Consequences:** Cron only on Production deployments; Hobby plan limits apply. Without Resend, job still records dry-run notifications. Replaced by the unified `Notification` model in D-021.

---

## D-019 — Vitest domain tests first; Playwright deferred

| | |
|---|---|
| **Date** | ROADMAP / 2026-08 |
| **Status** | accepted for now |

**Context:** Highest ROI is status/date/meter rules; E2E needs test auth and Blob.

**Decision:** Vitest unit tests for domain (+ some helpers). No Playwright yet. GitHub Actions: install, `prisma generate`, `tsc`, lint, test.

**Alternatives:** Full E2E before domain coverage.

**Consequences:** CI catches rule regressions; UI regressions need manual smoke until E2E exists.

---

## D-020 — Approval-gated phased delivery

| | |
|---|---|
| **Date** | ROADMAP process |
| **Status** | accepted |

**Context:** Large rewrite; user learning BE; avoid shipping the whole app dark.

**Decision:** Explain → wait for approval → implement one phase → teach → user tests.

**Alternatives:** Big-bang PR; unsupervised multi-phase coding.

**Consequences:** Slower calendar time; fewer wrong turns. User later approved Phases 1–5 in batch when ready.

---

## D-021 — In-app notifications + due digests with deep links

| | |
|---|---|
| **Date** | 2026-08-11 |
| **Status** | accepted |

**Context:** Need review reminders (daily while under review), one-shot overdue alerts, email CTAs, and a light in-app inbox — not email-only rows.

**Decision:** Replace `EmailNotification` with `Notification` (`dedupeKey`, `actionPath`, `readAt`, email status). Cron `processDueNotifications` creates:
- `REVIEW_PENDING` once per LPO per Dubai business day + digest email with absolute links
- `ASSIGNMENT_OVERDUE` / `PRODUCTION_OVERDUE` / `CLIENT_DELIVERY_OVERDUE` once per `dueAt`
Deep links: `/lpo/{id}?action=assign|dates|complete` via `APP_BASE_URL` (fallback `VERCEL_URL`). Bell + `/notifications` mark read and open `actionPath`.

**Alternatives:** Keep email-only table; per-user notification targeting; push/webhooks.

**Consequences:** Single source of truth for inbox and email idempotency. Shared-admin inbox (not per-user). Cron still dry-runs without Resend.

---

## How to add a new decision

When you change something that would confuse a future reader (library, pattern, product rule, intentional omission), append **D-0XX** with the same sections. Prefer honesty about tradeoffs over marketing the choice.
