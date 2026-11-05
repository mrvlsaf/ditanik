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
          "Enter number, nickname, client, received date, and upload the LPO PDF — uploading a PDF also tries to auto-fill the form fields and line items (best-effort; always review before saving). Status becomes Under Review automatically.",
        href: "/lpo",
      },
      {
        title: "Receive fabric",
        detail:
          "On Fabric, record a supplier invoice (PDF required) with one or more batch lines (type, colour, meters).",
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
          "Required: LPO number, nickname, client, received date, original PDF. Defaults: assignment +2 days, production +12, client delivery +15.",
        href: "/lpo",
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
      "You cannot assign until the LPO is Under Review with a production PDF ready.",
      "Dashboard columns show production due and client delivery for operational tracking.",
      "Deep links from notifications open ?action=assign, dates, or complete on the LPO page.",
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
          "Supplier name, invoice/reference, date, invoice PDF (required), and one or more lines (type, colour, qty meters, remarks). Each line becomes a batch with a system fabric code (FAB-…).",
        href: "/fabric",
      },
      {
        title: "Check available stock",
        detail:
          "The stock table shows remaining meters per batch (received − issued + returned, etc.).",
        href: "/fabric",
      },
      {
        title: "Issue to manufacturer",
        detail:
          "Pick batch, manufacturer, quantity, optional LPO link. Stock decreases; a movement is recorded.",
        href: "/fabric",
      },
      {
        title: "Return from manufacturer",
        detail:
          "Return unused meters to stock. Creates a RETURNED movement.",
        href: "/fabric",
      },
      {
        title: "Find invoices later",
        detail:
          "Use Invoices to filter by supplier, month, or reference and open the PDF.",
        href: "/invoices",
      },
    ],
    tips: [
      "Invoice PDF is required on every receive.",
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
      "Generate the client-facing paperwork for an LPO — Quotation, Quote, Tax Invoice, Delivery Note — as branded Excel files, then optionally convert each to PDF.",
    steps: [
      {
        title: "Generate a document",
        detail:
          "From an LPO detail page, choose the document type and generate it. Each one is numbered automatically and snapshotted from the LPO and company profile at that moment — later LPO edits don't change a document already generated.",
        href: "/lpo",
      },
      {
        title: "Download the Excel file",
        detail:
          "Every generated document downloads immediately as a formatted .xlsx file. This always works and needs no extra setup.",
      },
      {
        title: "Convert to PDF (optional)",
        detail:
          "Turns a generated document into a PDF via the Gotenberg service. This needs Gotenberg configured first — if it isn't set up, you'll see a clear \"PDF conversion isn't set up\" message, and the Excel file remains available as a fallback.",
        href: "/documents/convert",
      },
    ],
    tips: [
      "Generated documents are the permanent audit trail — deleting an LPO is blocked once any document exists against it.",
      "If Convert to PDF isn't available yet, the .xlsx download is the reliable option in the meantime.",
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
        detail:
          "Deactivated rates no longer appear when adding LPO fabric requirements.",
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
          "LPO original, production file, and fabric invoice must be PDFs. View/Download opens the private file viewer.",
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
      "Fill supplier + invoice reference + PDF before submitting Receive fabric.",
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
      className="block rounded-md px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
    >
      {section.title}
    </a>
  );
}

export function HelpOpenLink({
  href,
  children,
}: Readonly<{
  href: string;
  children: React.ReactNode;
}>) {
  return (
    <Link
      href={href}
      className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900"
    >
      {children}
    </Link>
  );
}
