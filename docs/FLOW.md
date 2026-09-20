# Execution flows

How requests travel through Ditanik: files, functions, and order.  
**Bugs live in the gaps between files** — use this map before changing a path.

Last updated: 2026-09-20 (Vercel Blob storage, Sentry error tracking, Vercel Firewall rate limiting, Preview/Production DB isolation, and the document-generation module added since the greenfield rewrite).

---

## Layer cheat sheet

```text
Browser / Cron
  → middleware.ts                    (auth gate; cron/auth APIs exempt)
  → app/**/page.tsx | route.ts | *-action.ts
      → modules/*/application/*      (Zod, authz actor, $transaction, audit)
          → modules/*/domain/*       (pure rules)
          → lib/db.ts (prisma)       (Neon retry extension)
          → modules/files/*          (PDF store/read)
          → Resend (optional)        (due notification emails)
```

**Rule:** Pages should not call Prisma when an application function exists. Domain must not import Prisma.

---

## 1. Auth (Google allowlist)

```text
User hits any app URL
  → middleware.ts (auth wrapper)
      → not logged in → redirect /login?callbackUrl=…
      → /api/auth/* → next()
      → /api/cron/* → next() (secret checked in route)
      → /api/* without session → 401 JSON

User clicks Google on /login
  → app/auth-actions.ts signInWithGoogle
  → app/api/auth/[...nextauth]
  → auth.ts callbacks:
      signIn → isEmailAllowlisted (lib/auth/allowlist.ts)
           → dynamic import lib/db → prisma.user.upsert
      jwt → load userId + role
      session → session.user.id / role
  → redirect /lpo
  → app/(app)/layout.tsx auth() again → AppShell
```

**Modify auth?** Start at `auth.ts` + `middleware.ts` + `lib/auth/allowlist.ts`. Do not put Prisma in middleware Edge bundle (keep dynamic import pattern).

---

## 2. Create LPO

```text
app/(app)/lpo/page.tsx
  → components/lpo/CreateLpoForm.tsx  (client, useActionState)
      → modules/lpo/application/create-lpo-action.ts
          → auth() + resolve User by email
          → createLpo(...)
              → createLpoFormSchema (schemas/create-lpo.ts)
              → parseCalendarDateInput / isReceivedDateAllowed (domain/due-dates.ts)
              → storePdfUpload → getFileStorage().save (folder lpo-originals)
              → defaultLpoDatesFromReceived (+2/+12/+15)
              → prisma.$transaction:
                    lpo.create status LPO_RECEIVED
                    lpo.update status UNDER_REVIEW   (auto)
                    auditLog LPO_CREATED
          → revalidatePath("/lpo")
```

**List after create:** same page → `listRecentLpos` (`get-lpo.ts`) → table + `DocumentActions` for original PDF.

**Modify create fields/dates?** Schema + `create-lpo.ts` + form. Status auto-transition lives in create transaction + `initialStatusAfterCreate()`.

---

## 3. LPO detail — dates, assign, complete delivery, fabric requirement

```text
app/(app)/lpo/[id]/page.tsx
  → getLpoById / listManufacturers / listActiveRates / listForLpo
  → UI sections:
      DocumentActions (original + production)
      LpoDatesSection → changeLpoDateAction → changeLpoDate
      LpoAssignmentPanel → assignManufacturerAction | markClientDeliveryCompletedAction
      LpoFabricRequirementsSection → add/delete requirement actions
```

### 3a. Change a deadline

```text
changeLpoDateAction (bound with lpoId)
  → changeLpoDate
      → changeLpoDateSchema (reason required for ASSIGNMENT / PRODUCTION_DEADLINE)
      → assertDateChangeReason
      → update Lpo date field + LpoDateChange row + audit LPO_DATE_CHANGED
```

### 3b. Assign manufacturer

```text
assignManufacturerAction
  → assignManufacturerToLpo
      → assignManufacturerSchema (existing XOR new name)
      → assertCanAssignManufacturer (must be UNDER_REVIEW)
      → storePdfUpload (lpo-production)
      → $transaction:
            create/find Manufacturer (nameNormalized)
            update Lpo: manufacturerId, production file, status ASSIGNED_TO_MANUFACTURER
            audit LPO_ASSIGNED_MANUFACTURER
```

### 3c. Mark client delivery completed

```text
markClientDeliveryCompletedAction
  → markClientDeliveryCompleted
      → assertCanMarkClientDeliveryCompleted (ASSIGNED + manufacturer + production file)
      → status CLIENT_DELIVERY_COMPLETED, clientDeliveredAt = now
      → audit LPO_CLIENT_DELIVERY_COMPLETED
```

### 3d. Expected fabric on LPO

```text
addLpoFabricRequirementAction
  → addRequirement
      → load GarmentConsumptionRate OR inline meters
      → calculateExpectedMeters (domain/meters.ts)
      → create LpoFabricRequirement + audit
```

**Modify status gates?** `modules/lpo/domain/lpo-status.ts` first, then UI that imports those helpers, then application asserts.

---

## 4. View / Download any PDF

```text
DocumentActions (client)
  → View → DocumentViewer ← GET /api/files?key=…
  → Download → GET /api/files?key=…&download=1

app/api/files/route.ts
  → auth() required
  → resolve key against:
        Lpo.originalFileKey | Lpo.productionFileKey
        OR FabricSupplierInvoice.invoiceFileKey
  → readStoredFile(key) → getFileStorage().read
  → stream bytes (private, no-store)
```

**Modify storage backend?** Implement `FileStorage` + change `getFileStorage()` only. Do not scatter `fs` calls in features.

**Current state:** `getFileStorage()` returns `vercelBlobStorage` whenever `BLOB_READ_WRITE_TOKEN` is set (auto-injected once a Blob store is connected in Vercel — see README's deploy checklist), and falls back to `localFileStorage` otherwise so local dev needs no extra setup. Durable on Vercel; local disk is dev-only.

---

## 5. Receive fabric (multi-batch + required invoice)

```text
app/(app)/fabric/page.tsx
  → ReceiveFabricForm
      → receiveFabricAction
          → parse batchesJson
          → require invoice PDF File
          → receiveFabric
              → receiveFabricSchema
              → storePdfUpload (fabric-invoices)
              → $transaction:
                    FabricSupplierInvoice
                    for each line: FabricBatch + Movement RECEIVED (+)
                    audit FABRIC_RECEIVED
          → revalidatePath /fabric, /invoices
```

Stock table on same page: `listBatchesWithStock` → sum movements per batch.

---

## 6. Issue / return fabric

```text
IssueFabricForm → issueFabricAction → issueFabric
  → check getBatchStock >= qty
  → Movement ISSUED (−qty) + manufacturerId + optional lpoId
  → audit FABRIC_ISSUED

ReturnFabricForm → returnFabricAction → returnFabric
  → Movement RETURNED (+qty) + manufacturerId
  → audit
```

Movement ledger: `listRecentMovements`.

---

## 7. Invoices page (filters)

```text
app/(app)/invoices/page.tsx  (searchParams: supplier, month, q)
  → listFabricInvoiceSuppliers / listFabricInvoiceMonths / listFabricInvoices
  → filter in query + Dubai month key in memory
  → DocumentActions when invoiceFileKey present
```

**Modify month TZ?** `list-fabric-invoices.ts` uses `BUSINESS_TIMEZONE` (Asia/Dubai).

---

## 8. Manufacturers + fabric ledger + variance

```text
/manufacturers → listManufacturers + CreateManufacturerForm
/manufacturers/[id]
  → getManufacturerFabricLedger
      → movements for manufacturer → summarizeManufacturerBatchLedger (domain)
      → sum LpoFabricRequirement for LPOs assigned to manufacturer
      → additional fabric = max(0, required − expectedBalanceOnHand)
  → VarianceForm → createVarianceAction → createVariance
      → calculateVarianceDifference → FabricVariance row + audit
```

---

## 9. Consumption rates

```text
/consumption → ConsumptionRatesPanel
  → createConsumptionRateAction / deactivateConsumptionRateAction
  → consumption.ts (createRate / deactivateRate / listActiveRates)
```

Used by LPO fabric requirement dropdown.

---

## 10. Document generation + Convert to PDF

```text
app/(app)/lpo/[id]/page.tsx
  → GenerateDocumentButtons (Quotation | Quote | Tax Invoice | Delivery Note)
      → generate{Quotation,Quote,Invoice,DeliveryNote}Action
          → generate{...}(lpoId, generatedByUserId, notes?)
              → getCompanyProfile()
              → allocateDocumentSequence (type, calendarDay) — atomic counter
              → formatDocumentNumber (site code + type + date + sequence)
              → build{...}Workbook (ExcelJS fills the checked-in .xlsx template)
              → storeGeneratedFile → getFileStorage().save
              → GeneratedDocument row (type, documentNumber, file key, JSON snapshot)
          → revalidatePath("/lpo/[id]")
```

**Snapshot matters:** each `GeneratedDocument` keeps its own copy of the line items and totals it was generated with — editing the LPO afterward never changes an already-generated document.

### Convert to PDF

```text
GeneratedDocumentRow "Convert to PDF" button
  → convertDocumentToPdfAction
      → convertOfficeFileToPdf (modules/documents/infrastructure/pdf-conversion.ts)
          → POST {GOTENBERG_URL}/forms/libreoffice/convert
          → no GOTENBERG_URL set → PdfConversionNotConfiguredError (friendly message, not a crash)
          → Gotenberg unreachable/non-2xx → PdfConversionFailedError (friendly message)
  → on success: PDF stored alongside the Excel file

Standalone flow: app/(app)/documents/convert/page.tsx → POST /api/documents/convert-to-pdf
  → same convertOfficeFileToPdf, no LPO/DB involvement, streams the PDF back directly
```

**Modify Gotenberg wiring?** `pdf-conversion.ts` is the single swap point (same pattern as `get-file-storage.ts`) — see `infra/gotenberg/README.md` for standing up the service itself.

### In progress / last change
- 2026-09-20: documented the document-generation + Convert-to-PDF flow (missing from this file since the module shipped); confirmed Gotenberg being unset only disables Convert to PDF, not document generation itself.

---

## 11. Due notifications cron + inbox

```text
Vercel Cron (vercel.json) GET /api/cron/overdue  @ 06:00 UTC
  → middleware allows /api/cron/*
  → route checks Authorization: Bearer CRON_SECRET
  → processDueNotifications
      → REVIEW_PENDING (UNDER_REVIEW): one row per LPO per Dubai day
            → digest email with APP_BASE_URL deep links (?action=assign)
      → ASSIGNMENT_OVERDUE / PRODUCTION_OVERDUE / CLIENT_DELIVERY_OVERDUE
            → one row per (lpoId, type, dueAt) via dedupeKey
            → email (or dry-run) with Open LPO CTA → ?action=assign|dates|complete
  → Notification rows power bell + /notifications (mark read)
  → LPO detail honors ?action= and scrolls to #lpo-assign|#lpo-dates|#lpo-complete
```

**Modify cron auth?** Keep secret check in the route (not only middleware).

### In progress / last change
- 2026-08-11: unified Notification model + deep links (D-021).

---

## 12. Database access & errors

```text
Any prisma.* call
  → lib/db.ts Prisma client $extends
      → on P1001/unreachable: retry with backoff + $connect
      → then DatabaseUnavailableError (lib/db-errors.ts)
  → bubbles to app/error.tsx | app/(app)/error.tsx
      → AppErrorFallback (“Database is waking up” vs generic)
```

---

## 13. Nav surface map

| Route | Entry | Primary modules |
|-------|--------|-----------------|
| `/lpo` | list + create | `modules/lpo` |
| `/lpo/[id]` | detail workflow | `lpo` + `fabric` requirements + `manufacturer` |
| `/fabric` | receive/stock/issue/return | `modules/fabric` |
| `/invoices` | filtered invoice PDFs | `list-fabric-invoices` |
| `/manufacturers` | registry | `modules/manufacturer` |
| `/manufacturers/[id]` | ledger + variance | `manufacturer-ledger`, `variance` |
| `/consumption` | garment rates | `consumption` |
| `/notifications` | due inbox | `modules/notification` |
| `/help` | operator knowledge base / user flows | `components/help` |
| `/login` | Google | `auth.ts` |

Defined in `lib/navigation.ts` → `AppShell`.

Layout streams shell after `auth()` only; notification bell and page data load inside `Suspense` (see `app/(app)/loading.tsx` for full-page pending UI).

### In progress / last change
- 2026-08-11: streaming nav + loading spinners; bell no longer blocks layout.

---

## When you change something — update this section

If your PR touches a flow above, add a short note under the relevant section:

```text
### In progress / last change
- YYYY-MM-DD: what path you modified and why (link DECISIONS.md id if any)
```

Example:

```text
### In progress / last change
- 2026-08-11: documenting flows pre-Vercel Blob; storage still local (D-010).
```

---

## Quick “where do I look?” index

| Symptom | Start here |
|---------|------------|
| Cannot log in / allowlist | `auth.ts`, `lib/auth/allowlist.ts`, Google redirect URIs |
| Redirect loop / 401 API | `middleware.ts` |
| Wrong LPO status / button missing | `domain/lpo-status.ts` → assignment panel |
| Wrong due dates | `domain/due-dates.ts` |
| PDF upload fails size | `next.config.ts` bodySizeLimit + `pdf-rules.ts` |
| PDF missing on Vercel | Fixed — `get-file-storage.ts` uses Vercel Blob whenever `BLOB_READ_WRITE_TOKEN` is set |
| Convert to PDF failing | `GOTENBERG_URL` env var (not yet deployed — see `infra/gotenberg/README.md`), `pdf-conversion.ts` |
| PDF auto-fill (prefill) failing | `lpo-extraction.ts`, `pdf-text-extraction.ts`, `serverExternalPackages` in `next.config.ts` |
| Stock math wrong | `domain/meters.ts` + movement types in issue/receive |
| Invoice not listed | `list-fabric-invoices.ts` filters; invoice required on receive |
| Cron 401 | `CRON_SECRET` vs `Authorization` header on route |
| Neon sleep errors | `lib/db.ts` retries + `db-errors.ts` UI |
