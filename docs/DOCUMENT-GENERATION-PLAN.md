# Ditanik — Client Document Generation (Quotation / Invoice / Delivery Note / Quote)

Implementation plan, based on the 5 real files you shared: `JOHNLPO.pdf` (a client purchase order, from Ishraq Hospitality / The Plaza Bistro), `Quotation.pdf`, `Quote.pdf`, `Invoice.pdf`, `DeliveryNote.pdf`.

## 1. What the templates actually contain

Reading all five side by side changes the plan a bit from our earlier general discussion, so I'm listing exactly what I found before proposing anything.

**The incoming LPO (`JOHNLPO.pdf`)** is a structured 2-page purchase order from the client's own procurement system (Ishraq Hospitality). It carries: Deezano's own name/address as the recipient block, an Order Number, Order date, Delivery date, Currency, an Invoice address block (entity, sub-entity, TRN, address), a Delivery address block, a line-item table (position, item description, article no., price per unit, quantity, line total, discount, total after discount), net/tax/gross totals, delivery info, payment terms, and buyer/supplier contact details on page 2. This one client's LPOs happen to be very structured — but you told me last time (and I'd still assume) that other clients won't all format their POs this way, so I'm not planning around parsing this automatically. More below.

**`Quotation.pdf`** — Deezano header (logo, TRN, phone, website, office address) top-left, "QUOTATION" heading top-right with a Date + Quote# box, a Customer block (TRN, entity, sub-entity, address), a line table (No. / Category / Description / Quantity / Amount per unit / Total amount), then Sub Total / VAT 5% / Grand Total rows highlighted in yellow, and a one-line company footer.

**`Quote.pdf`** — same layout family as the quotation, plus one extra field: **Validity** date next to Date/Quote#, and grouped line items under category header rows (Chef / Commis / Barista / Waiter-Waitress) in this example. **Per your answer below, Quote and Quotation are two distinct document types**: Quotation uses the same simple table shape as the Invoice and Delivery Note (No. / Description / Quantity / Amount per unit / Total amount — no Category column), while Quote adds a Terms & Conditions block, and the two have different headings. I'm treating this as **4 templates, not 3** — Quotation, Quote, Invoice, Delivery Note — and I'll confirm the exact heading text and whether Quote also needs the category-grouping / Validity field once I see the source Excel files.

**`Invoice.pdf`** — titled "TAX INVOICE". Same header style as the quotation, a Date + Tax Invoice# + **LPO Reference** box (this ties the invoice back to the originating purchase order number), a Customer block, a line table (No. / Description / Quantity / Amount per unit / Total amount — no Category column here), Sub Total / VAT / Grand Total, footer.

**`DeliveryNote.pdf`** — titled "DELIVERY NOTE". Header block plus a highlighted corner box with **Delivery Challan#** and **LPO Reference**, a separate **Delivery Note #** row, a Dispatch Date, a Customer block with **Note Date** and **Note Type** ("Job work"), the same line table shape as the invoice, Subtotal/VAT/Total, and a freeform **Notes** field at the bottom (used here for an alteration/tailoring remark).

Across all three outgoing documents, the recurring building blocks are: **your company header** (constant), **a customer block** (entity, sub-entity, TRN, address — comes from the LPO), **a line-item table** (description, qty, unit price, line total, sometimes category/discount), **subtotal/VAT/grand total**, and **a document number + date(s) + LPO reference**. That's a clean, buildable shape.

## 2. What this means for "extract from the LPO PDF"

None of your three sample numbers/company addresses are perfectly consistent with each other (the office address on `Quotation.pdf` and `Quote.pdf` don't match each other; the Delivery Note shows a "Delivery Challan#" and a "Delivery Note #" as two different numbers on the same document). That's not a criticism — it's exactly the kind of drift that happens when four different documents are hand-built in Excel by whoever's at the desk that day. It's also the strongest argument for this feature: once there's one stored company profile and one set of line items per order, that drift disappears everywhere at once.

For the client-side data (their name, TRN, address, the item list), my earlier instinct was to rule out automatic extraction entirely, on the assumption that every client's LPO looks different. **You've now told me most/all LPOs will be almost similar in structure** — if that holds, extraction becomes worth doing, not as a replacement for the manual-entry form, but as a **prefill step in front of it**:

1. On upload, run a parsing pass over the LPO PDF's text (order number, order date, invoice/delivery address blocks, the item table's rows, net/tax/gross totals) and pre-populate the Client & Commercial Details and Line Items sections of the Create LPO form.
2. You still see every field on the form before submitting — nothing generates a document, or even saves, off unreviewed extracted data. The difference is you're now correcting a handful of already-filled fields instead of typing all of them from scratch.
3. The manual-entry form stays fully functional and is the fallback whenever a particular LPO doesn't match the expected shape (a scanned copy, a one-off client, a multi-page table) — extraction just fails silently back to blank fields in that case, it never blocks LPO creation.

This is safe to add **after** Phase 1 rather than depending on it — the form works correctly with fully manual entry on day one, and prefill is a pure UX improvement layered on top once the form and data model are proven. I've added it as Phase 6 below.

**Confirmed: every client's LPO follows the same structure — the same table shape, the same address blocks, the same overall layout — and only the content inside it (the client, the items, the prices) changes.** That's the best-case scenario for extraction: it means one deterministic, rule-based parser (match on fixed labels like "Order Number", "Order date", "Invoice address", "Delivery address", then read the table beneath those labels) can realistically cover essentially all incoming LPOs, rather than needing a flexible/LLM-based extractor that adapts per document. I'm treating this as the confirmed direction for Phase 6 rather than a hypothetical.

Two parts of the LPO are not equally easy to parse, though, even with a fixed layout, and I want to be upfront about that rather than oversell it:
- The **header fields** — order number, order date, delivery date, currency, the invoice/delivery address blocks, TRN, payment/delivery terms — are simple label-then-value pairs and should extract reliably and quickly.
- The **line-item table** is the harder part, even in a single consistent layout: your own sample LPO has multi-line item descriptions wrapping across several lines inside one cell, embedded sub-codes in the text (article numbers, a location tag like "(15 - Savana Coffee Shop)"), and the table itself spans onto a second PDF page. A table parser has to handle all of that correctly to avoid mis-splitting rows or merging two items into one. I'd build and test this part specifically against a handful of your real LPOs before trusting it, and it's the piece most likely to need a manual correction now and then even once it's working well — which is exactly why prefill-then-review (never prefill-then-auto-generate) stays the rule regardless of how good the parser gets.

## 3. Data model additions

Ditanik's `Lpo` model today only has `lpoNumber`, `nickname`, `clientName`, dates, and file keys — no line items, no client address/TRN, no company letterhead data anywhere. New Prisma models, following the existing style (Decimal for money/meters, append style for history, audit logging):

- **`CompanyProfile`** (single row) — Deezano's legal name, TRN, address, phone, website, email, logo (stored file key), bank details if you want them on invoices, and a default terms/footer text. Entered once in a new settings page; every generated document reads from here so the header is never retyped or drifted again.
- **`LpoClientDetails`** (one-to-one with `Lpo`, or extra columns directly on `Lpo`) — client entity name, sub-entity name (e.g. "MOHAMED & OBAID ALMULLA LLC"), client TRN, invoice address, delivery address, payment terms, delivery terms, currency (default AED). These map straight to what's in the LPO's Invoice/Delivery address blocks.
- **`LpoLineItem`** — per LPO: position, category (optional — used for the grouped Chef/Commis/Barista style order), description, article no. (optional), quantity, unit price, discount %, line total. Entered once per LPO; this is what all four documents draw their table rows from.
- **`GeneratedDocument`** — an audit/history row per generated file: type (`QUOTATION` / `QUOTE` / `TAX_INVOICE` / `DELIVERY_NOTE`), documentNumber, lpoId, generatedAt, generatedBy, stored file key(s) for the Excel and/or PDF, and a **JSON snapshot** of the exact data used. The snapshot matters: if you edit the company profile or an LPO's line items next month, a document generated today must still show today's numbers when re-downloaded, not silently change.
- Each `GeneratedDocument` keeps **its own copy of the line items it includes** (with quantities), rather than pointing rigidly at the LPO's line items. Your own examples show why: the Invoice you shared only bills 1 of the 2 line items on that LPO, and Delivery Notes/Invoices commonly cover partial quantities (staged delivery, partial billing). So "Generate Invoice" should let you pick which lines and how much of each, defaulting to the full LPO but editable.
- **`DocumentSequence`** — one row per (document type, site code, calendar day), holding a `lastSequence` counter, incremented atomically inside the generation transaction (same pattern already used elsewhere in the app for collision-safe codes, e.g. `resolveFabricCodes` in the fabric module). This is what makes "3rd quotation generated that day" a safe, race-condition-free counter instead of a `COUNT(*)` query.
- **Site code** — based on your numbering explanation, "AHO"/"AHD" identify the *delivery site* (e.g. "American Hospital"), not the client entity — one client can have multiple delivery sites. I'd add this as a field captured per LPO (with a small reusable "Sites" picklist per client so you're not retyping the same code for repeat locations), rather than hard-coding it on `Manufacturer`/client name.

This slots in as a new `modules/documents/` module, same domain → application → schema layering as `modules/lpo` and `modules/fabric` — nothing about the existing architecture needs to change.

## 4. Generation pipeline

Confirming the direction from our last conversation, and it fits these templates well: these look like documents that were designed and printed straight out of Excel (grid alignment, yellow highlight bands, merged header cells). That's the strongest signal to build this as **Excel template + fill + optional convert**, not a from-scratch HTML/PDF renderer:

1. Recreate each of the (likely 3, see below) document types as an `.xlsx` template with your exact layout, fonts, merges, and print area — stored in the repo like code, versioned alongside migrations.
2. A small library (ExcelJS) opens the template server-side and fills named cells/ranges from the LPO's company profile + client details + line items — nothing about layout is touched, only cell values.
3. Two outputs offered per generation: **Download Excel** (fully filled, editable exactly like your current workflow) and **Convert to PDF**.
4. A **separate "Convert to PDF"** action also accepts a re-uploaded, hand-edited Excel file — exactly the "browse and convert" flow you described — so a manual tweak before sending doesn't require touching the app's generated copy at all.

The PDF conversion step needs a real spreadsheet engine (LibreOffice), which can't run inside a Vercel serverless function. This is the one new piece of infrastructure the feature needs — a small self-hosted **Gotenberg** (open-source, Docker) instance on a cheap always-on VM, called over HTTP. I'd wire it up the same way `getFileStorage()` is a single swappable function today (`lib`/`modules/files` already does exactly this pattern for local-disk-vs-cloud storage) — one `convertToPdf()` entry point, easy to swap for a paid API later if you ever want to drop the VM.

## 5. UI additions

Per your answer, line items and client commercial details go **directly on the Create LPO form**, not as a later step — so the form grows from 4 fields + a file into:
- The existing fields (LPO number, nickname, client name, received date, PDF).
- **Client & commercial details** — sub-entity name, TRN, invoice address, delivery address, site code, payment/delivery terms, currency.
- **Line items** — a repeatable row group (category, description, article no., qty, unit price, discount), with a running subtotal/VAT/total shown live. Ditanik already has a UI pattern for exactly this shape — `ReceiveFabricForm`'s multi-batch rows on the Fabric page — so this reuses an established client-side pattern rather than inventing a new one.

On the **LPO detail page** (`/lpo/[id]`):
- **Four "Generate…" buttons** (Quotation / Quote / Invoice / Delivery Note), each opening a review step: confirm/adjust which line items and quantities go on this specific document, confirm dates, confirm the auto-suggested document number (editable), and — for the Delivery Note — a free-text Notes field. Then "Generate Excel" produces the file, with Download and Convert-to-PDF actions next to it.
- A **document history list** per LPO (and optionally a global `/documents` page), listing every generated file with re-download — same audit-trail spirit as the rest of the app.
- An **edit affordance** for the line items/commercial details entered at create time, since real orders change (price renegotiated, quantity adjusted) between creation and when a document actually gets generated.

A new small **Company Profile settings page** (one-time setup): logo upload, address, TRN, phone, website, bank details, default footer/terms text.

## 6. Numbering

Based on your explanation, the underlying rule is consistent even though the historical examples aren't perfectly formatted:

```
{SiteCode?}-{TYPE}-{DDMMYYYY}-{SequenceOfDay}
```

- `TYPE` — `QTN` (Quotation), presumably a distinct code for Quote, `INV` (Invoice), `DN` (Delivery Note).
- `DDMMYYYY` — the generation date. Some of your real examples are missing a digit (`2707026` instead of `27072026`) — I'd have the app always emit the full 8 digits, so that stops happening.
- `SequenceOfDay` — the Nth document *of that type* generated that calendar day (e.g. the 9th invoice today → `09`), reset to 1 at the start of each day, generated from the `DocumentSequence` counter above so two people generating at the same moment can't collide.
- `SiteCode` — identifies the delivery site/client location, e.g. `AHO`/`AHD`. **Confirmed: every document type gets a site code, including Quotation** (your sample quotation number just happened to predate that convention, or was created before a site was assigned).
- **Confirmed: the daily sequence is global per document type, reset every day regardless of site** — so "the 9th invoice generated today" counts every invoice across every client/site, not per-site. `DocumentSequence` is keyed on `(type, calendarDay)` only — no site dimension in the counter itself, even though the site code still appears in the printed number string.

One thing this still leaves open, only because I don't yet know the source Excel files' exact cell layout: whether `AHO` vs `AHD` (Invoice vs Delivery Note, same underlying site) should resolve to one stored site code per LPO used everywhere, or whether some document types intentionally use a different code for the same site. I'll treat it as **one site code per LPO, reused on every document type** unless the Excel files show otherwise once you send them.

## 7. Suggested phased delivery

Matching how the rest of Ditanik was built (explain → approve → build → teach → test), I'd break this into phases rather than one big change:

1. **Data model** — `CompanyProfile`, client/commercial details, `LpoLineItem`, `DocumentSequence`, migration, company-profile settings page, and the expanded Create LPO form (client details + repeatable line-item rows). No document generation yet — just getting trustworthy structured data flowing, and giving you the expanded create form to test on real LPOs for a bit before documents depend on it.
2. **One template end-to-end** — pick the simplest (Invoice or Delivery Note), build the Excel template + fill logic + numbering + download, prove the pipeline works on a real document.
3. **PDF conversion** — stand up Gotenberg, wire "Convert to PDF" and the re-upload-and-convert flow.
4. **Remaining three templates** — Quotation, Quote (with its Terms & Conditions block), and the remaining document type, reusing the pipeline from phase 2–3.
5. **History, polish** — `GeneratedDocument` history view, company profile refinements, edit affordance for line items after creation.
6. **LPO extraction/prefill (added on top, once the manual form is proven)** — a rule-based parser reading the fixed LPO layout, prefilling header fields (order number, dates, addresses, TRN, terms) with high confidence and the line-item table with best-effort accuracy, always landing in the same reviewable form from Phase 1 rather than saving or generating anything automatically.

## 8. What's still open

- **The four source Excel workbooks** — you'll share these later; you've confirmed they look exactly like the PDFs, just editable. Once I have them the templates can be pixel-identical (exact fonts, column widths, merges, print area) instead of a close visual reconstruction from PDFs — worth waiting for before building the actual templates in phase 2/4, even though the data-model phase (1) doesn't depend on them.
- **Quote's exact shape** — confirmed it's a distinct document with its own heading and a Terms & Conditions section; I still need the actual heading text and whether it also needs the category-grouping / Validity-date behaviour seen in the one example, or whether that was incidental to that particular order. The Excel file should settle this.
- **Numbering** — resolved: every document type (including Quotation) carries a site code, and the daily sequence counter is global per type, reset every day regardless of site. The one remaining detail (one site code per LPO vs. possibly different codes per document type) should also fall out of the Excel files.

## 9. Cost impact

This doesn't change the cost picture much from what we discussed — the only addition is the Gotenberg conversion server, roughly $5–6/month on a small always-on VM (Hetzner/DigitalOcean), or a pay-per-conversion API instead if you'd rather not manage a server. Everything else (Vercel, Neon, storage for the generated files) uses the same infrastructure already planned for the rest of the app.
