import Link from "next/link";

export type HelpStep = {
  title: string;
  detail: string;
  href?: string;
};

export type HelpSection = {
  id: string;
  title: string;
  summary: string;
  steps: HelpStep[];
  tips?: string[];
};

/** In-app knowledge base content for operating Ditanik. */
export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "quick-start",
    title: "Quick start (recommended order)",
    summary:
      "Follow this sequence the first time you use the app. Later days you can jump to any module.",
    steps: [
      {
        title: "Sign in",
        detail:
          "Use your allowlisted Google account. Only emails in ALLOWED_EMAILS can access the app.",
      },
      {
        title: "Add consumption rates",
        detail:
          "Define garment → meters (e.g. Shirt = 1.5m). LPOs use these to calculate expected fabric.",
        href: "/consumption",
      },
      {
        title: "Register manufacturers",
        detail:
          "Create manufacturers you work with, or register a new one later when assigning an LPO.",
        href: "/manufacturers",
      },
      {
        title: "Create an LPO",
        detail:
          "Open New LPO. Enter number, nickname, client, received date, and upload the LPO PDF. The Prefill from this PDF button tries to fill the form fields and line items from the PDF (best-effort; always review before saving). Status becomes Under Review automatically.",
        href: "/lpo/new",
      },
      {
        title: "Receive fabric",
        detail:
          "On Fabric, record a supplier invoice (PDF optional) with one or more batch lines (type, colour, meters).",
        href: "/fabric",
      },
      {
        title: "Assign manufacturer & complete delivery",
        detail:
          "On the LPO detail page, upload the production PDF, assign a manufacturer, then mark client delivery when done.",
        href: "/lpo",
      },
      {
        title: "Watch notifications",
        detail:
          "The bell and Notifications page surface review reminders and overdue dates with links to the right LPO action.",
        href: "/notifications",
      },
    ],
  },
  {
    id: "lpo-flow",
    title: "LPO lifecycle",
    summary:
      "Every client order moves through a fixed status path. Dates are calculated from the received date (Asia/Dubai end of day).",
    steps: [
      {
        title: "Create LPO (Under Review)",
        detail:
          "Required: LPO number, nickname, client, received date, original PDF. Defaults: assignment +2 days, production +12, client delivery +15. The New LPO page shows the dates before you save.",
        href: "/lpo/new",
      },
      {
        title: "Rush order? Switch on Urgent",
        detail:
          "Urgent LPOs are for orders delivered in 1 to 2 days. Switch on Urgent on the New LPO page: the PDF is optional, the number is made for you (URGENT_1, URGENT_2, and so on), and there are no dates, deadlines or reminders. Assign a manufacturer (no production PDF needed), then mark delivery completed. Find them under the Urgent filter on the LPO list.",
        href: "/lpo/new",
      },
      {
        title: "Review & extend dates if needed",
        detail:
          "Open the LPO. Extend assignment or production deadline with a mandatory reason. Client delivery reason is optional.",
      },
      {
        title: "Add expected fabric (optional but recommended)",
        detail:
          "Attach garment lines using consumption rates × quantity so the manufacturer ledger knows expected meters.",
      },
      {
        title: "Assign manufacturer",
        detail:
          "Choose an existing manufacturer or register a new one, upload the production PDF, then assign. Status → Assigned to manufacturer.",
      },
      {
        title: "Mark client delivery completed",
        detail:
          "When goods are delivered to the client, mark complete. Status → Client delivery completed.",
      },
    ],
    tips: [
      "You can delete an LPO from the dashboard or detail page (confirmation required).",
      "You cannot assign until the LPO is Under Review. A normal LPO also needs its production PDF; an urgent LPO does not.",
      "Dashboard columns show production due and client delivery for operational tracking.",
      "Each LPO page has tabs (Summary, Lines, Dates, Fabric needed, Production and delivery, Documents). A green Next step banner at the top says what to do next, and links from notifications open the right tab.",
      "PDF auto-fill is calibrated to a specific client's LPO layout — always review auto-filled fields and line items before saving, especially for a new client's PO format.",
      "Use Edit on the LPO detail page to correct client, dates, or line items. Once any document has been generated for an LPO, the LPO itself can no longer be deleted.",
    ],
  },
  {
    id: "fabric-flow",
    title: "Fabric inventory",
    summary:
      "Fabric is managed independently of LPOs, but issues can link to an LPO. Day-to-day stock uses append-only movements; admin Delete removes mistaken receives/batches (and their movements).",
    steps: [
      {
        title: "Receive fabric",
        detail:
          "On the Receive fabric tab: supplier name, invoice/reference, date, invoice PDF (optional), and one or more lines (type, colour, qty meters, remarks). Each line becomes a batch with a system fabric code (FAB-…).",
        href: "/fabric?tab=receive",
      },
      {
        title: "Check available stock",
        detail:
          "The Stock tab shows remaining meters per batch (received − issued + returned, etc.), with three totals above it.",
        href: "/fabric",
      },
      {
        title: "Issue to manufacturer",
        detail:
          "Press Issue on a batch, or open the Issue to manufacturer tab. Pick batch, manufacturer, quantity, optional LPO link. Stock decreases; a movement is recorded.",
        href: "/fabric?tab=issue",
      },
      {
        title: "Return from manufacturer",
        detail:
          "Return unused meters to stock from the Record a return tab. Creates a RETURNED movement. The Movements tab lists every movement.",
        href: "/fabric?tab=return",
      },
      {
        title: "Find invoices later",
        detail:
          "Fabric invoices are listed under Invoices, together with your tax invoices and your accessory and manufacturing invoices. Filter by type or month and open the PDF.",
        href: "/invoices",
      },
    ],
    tips: [
      "The supplier invoice PDF is optional — you can receive fabric without one.",
      "Add the invoice total incl. VAT when you have it. It is optional, and the Invoices page uses it for the VAT totals.",
      "You cannot issue more meters than available on a batch.",
      "Delete a batch from Fabric stock, or a whole invoice from Invoices, to undo a mistaken receive.",
    ],
  },
  {
    id: "manufacturer-ledger",
    title: "Manufacturer ledger & variance",
    summary:
      "Each manufacturer has a fabric account: what was sent, what LPOs expect to use, and variances when reality differs. Delete is blocked while they are assigned to LPOs.",
    steps: [
      {
        title: "Open a manufacturer",
        detail:
          "From Manufacturers, open a name to see the fabric ledger for that partner.",
        href: "/manufacturers",
      },
      {
        title: "Read the ledger",
        detail:
          "Issued / returned movements and expected fabric from assigned LPOs drive “additional fabric needed” style callouts.",
      },
      {
        title: "Record variance",
        detail:
          "When expected vs actual differs, submit a variance with a reason (wastage, damage, size alteration, production mistake, other).",
      },
    ],
  },
  {
    id: "document-generation",
    title: "Document generation & PDF conversion",
    summary:
      "Generate the client-facing paperwork — Quotation, Tax Invoice, Delivery Note — as branded Excel files, either from an LPO or on their own, then optionally convert each to PDF.",
    steps: [
      {
        title: "Generate a document",
        detail:
          "From an LPO page, open the Documents tab, choose the document type and generate it. Each one is numbered automatically and snapshotted from the LPO and company profile at that moment — later LPO edits don't change a document already generated.",
        href: "/lpo",
      },
      {
        title: "Generate a document without an LPO",
        detail:
          "Open Documents → New document, choose Quotation, Tax Invoice or Delivery Note, type the site code, client details and line items, and generate. It is numbered like any other document and is never linked to an LPO. The Documents page lists every document, with type and source filters and a search box.",
        href: "/documents/new",
      },
      {
        title: "Download the Excel file",
        detail:
          "Every generated document downloads immediately as a formatted .xlsx file. This always works and needs no extra setup.",
      },
      {
        title: "Convert to PDF (optional)",
        detail:
          "Press Convert to PDF on a row in Documents. It uses the Gotenberg service, which needs configuring first — if it isn't set up, you'll see a clear \"PDF conversion isn't set up\" message, and the Excel file remains available as a fallback. For an Excel file you edited yourself, use the Convert a file to PDF tab on the Documents page.",
        href: "/documents?tab=convert",
      },
    ],
    tips: [
      "Generated documents are the permanent audit trail — deleting an LPO is blocked once any document exists against it. Documents can't be edited after they're generated; to correct one, generate a new document.",
      "If Convert to PDF isn't available yet, the .xlsx download is the reliable option in the meantime.",
    ],
  },
  {
    id: "invoices",
    title: "Invoices and VAT",
    summary:
      "One list of every invoice, for VAT filing and payments: tax invoices you send to clients, and invoices you receive for fabric, accessories and manufacturing.",
    steps: [
      {
        title: "Browse and filter",
        detail:
          "Open Invoices. Pick a type card, a month, or search by reference, client or supplier. For tax invoices you can also show only those with an LPO or without one.",
        href: "/invoices",
      },
      {
        title: "Read the VAT totals",
        detail:
          "The three tiles above the list add up VAT charged (tax invoices), VAT paid (invoices you received) and the net, for whatever is on screen. A fabric invoice saved without a total is left out and the tile says so.",
        href: "/invoices",
      },
      {
        title: "Add an accessory or manufacturing invoice",
        detail:
          "Use Add invoice. Choose the kind, enter the supplier, optional reference and date received, upload the supplier's PDF (required) and copy the lines with their VAT %. The invoice is not linked to any LPO or manufacturer.",
        href: "/invoices/new",
      },
      {
        title: "Tax invoices and fabric invoices",
        detail:
          "Tax invoices are created in Documents, from an LPO or on their own. Fabric invoices are added when you receive fabric.",
        href: "/documents/new",
      },
    ],
    tips: [
      "Accessory and manufacturing invoices can be deleted from the More menu on their row. Tax invoices stay in Documents.",
      "Always check the VAT totals against your VAT return. They cover only the invoices recorded here.",
    ],
  },
  {
    id: "consumption",
    title: "Consumption rates",
    summary:
      "Standard meters per garment. Keep this table current so LPO expected fabric stays accurate.",
    steps: [
      {
        title: "Create a rate",
        detail: "Garment name + meters (decimal allowed).",
        href: "/consumption",
      },
      {
        title: "Deactivate unused rates",
        detail: "Deactivated rates no longer appear when adding LPO fabric requirements.",
        href: "/consumption",
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications & reminders",
    summary:
      "A daily job creates in-app notifications (and optional email). The bell and Notifications page are the inbox.",
    steps: [
      {
        title: "Review pending",
        detail:
          "While an LPO stays Under Review, a daily reminder is created (once per Dubai business day).",
        href: "/notifications",
      },
      {
        title: "Overdue alerts",
        detail:
          "Assignment, production, or client delivery past due creates a one-shot overdue notification with a deep link to the action.",
      },
      {
        title: "Open & mark read",
        detail:
          "Use the bell or Notifications list. Opening an item jumps to the LPO section you need; mark read when handled.",
        href: "/notifications",
      },
    ],
    tips: [
      "Without Resend configured, emails dry-run but in-app rows still appear after the cron runs.",
      "Urgent LPOs have no dates, so they never raise reminders or an Overdue tag.",
      "Locally, cron is triggered manually (see Help → Ops tips).",
    ],
  },
  {
    id: "ops-tips",
    title: "Ops tips & common issues",
    summary: "Practical notes for day-to-day use and first-time setup.",
    steps: [
      {
        title: "PDFs",
        detail:
          "LPO original, production file, fabric invoice and accessory or manufacturing invoice must be PDFs. View/Download opens the private file viewer.",
      },
      {
        title: "Slow pages / Neon sleep",
        detail:
          "Free Neon may sleep. First action after idle can take a few seconds. Wait and retry if a save fails with a connection/transaction message.",
      },
      {
        title: "Header & navigation",
        detail:
          "Sidebar switches modules. The top header shows the current page title and the notification bell.",
      },
    ],
    tips: [
      "Fill supplier and invoice reference before submitting Receive fabric. The PDF and total are optional.",
      "Keep at least one Under Review LPO if you want to test notifications.",
    ],
  },
];

export function HelpTocLink({
  section,
}: Readonly<{
  section: HelpSection;
}>) {
  return (
    <a
      href={`#${section.id}`}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
    >
      {section.title}
    </a>
  );
}

export function HelpOpenLink({
  href,
  asButton,
  children,
}: Readonly<{
  href: string;
  /** Show as a small button (used beside a step) instead of an inline link. */
  asButton?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <Link
      href={href}
      className={
        asButton
          ? "btn-secondary min-h-9"
          : "font-medium text-[var(--brand)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--brand)]"
      }
    >
      {children}
    </Link>
  );
}
