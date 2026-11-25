import Link from "next/link";
import { notFound } from "next/navigation";

import { Chip } from "@/components/ui/Chip";
import { PageContainer } from "@/components/app-shell/PageContainer";
import { LpoActionsMenu } from "@/components/lpo/LpoActionsMenu";
import { LpoAssignmentPanel } from "@/components/lpo/LpoAssignmentPanel";
import { LpoDatesSection } from "@/components/lpo/LpoDatesSection";
import { LpoDeepLinkFocus } from "@/components/lpo/LpoDeepLinkFocus";
import { LpoFabricRequirementsSection } from "@/components/lpo/LpoFabricRequirementsSection";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import { OpenTabLink } from "@/components/lpo/OpenTabLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { GenerateDocumentButton } from "@/components/documents/GenerateDocumentButton";
import { GeneratedDocumentRow } from "@/components/documents/GeneratedDocumentRow";
import { formatBusinessDateTime, formatCalendarDate } from "@/lib/dates/format";
import { listActiveRates } from "@/modules/fabric/application/consumption";
import { generateQuotationAction } from "@/modules/documents/application/generate-quotation-action";
import { generateInvoiceAction } from "@/modules/documents/application/generate-invoice-action";
import { generateDeliveryNoteAction } from "@/modules/documents/application/generate-delivery-note-action";
import { documentTypeLabel } from "@/modules/documents/domain/independent-document";
import { listGeneratedDocumentsForLpo } from "@/modules/documents/application/list-generated-documents";
import { listForLpo } from "@/modules/fabric/application/lpo-fabric-requirements";
import { getLpoById } from "@/modules/lpo/application/get-lpo";
import {
  DEFAULT_VAT_PERCENT,
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateVatAmount,
} from "@/modules/lpo/domain/line-items";
import {
  extensionLabel,
  initialDetailTab,
  nextStepFor,
  primaryActionFor,
  progressSteps,
} from "@/modules/lpo/domain/lpo-detail";
import { lpoStatusDetailLabel } from "@/modules/lpo/domain/lpo-status";
import type { NotificationAction } from "@/modules/notification/domain/due-notification-rules";
import { listManufacturers } from "@/modules/manufacturer/application/manufacturers";
import { isUsingBlobStorage } from "@/modules/files/infrastructure/get-file-storage";

function parseActionParam(
  value: string | string[] | undefined,
): NotificationAction | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "assign" || raw === "dates" || raw === "complete") {
    return raw;
  }
  return null;
}

function parseRequestIdParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw ?? null;
}

export default async function LpoDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    action?: string | string[];
    r?: string | string[];
    tab?: string | string[];
  }>;
}>) {
  const { id } = await params;
  const query = await searchParams;
  const action = parseActionParam(query.action);
  const requestId = parseRequestIdParam(query.r);
  const tabParam = parseRequestIdParam(query.tab);
  const [lpo, manufacturers, rates, requirements, generatedDocuments] = await Promise.all(
    [
      getLpoById(id),
      listManufacturers(),
      listActiveRates(),
      listForLpo(id),
      listGeneratedDocumentsForLpo(id),
    ],
  );

  if (!lpo) {
    notFound();
  }

  const createdByLabel = lpo.createdBy.name ?? lpo.createdBy.email;
  const heading = lpo.nickname?.trim() ? lpo.nickname : `LPO ${lpo.lpoNumber}`;

  const subtotal = calculateLineItemsSubtotal(
    lpo.lineItems.map((line) => ({ lineTotal: Number(line.lineTotal) })),
  );
  const vatAmount = calculateVatAmount(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, vatAmount);

  const nextStep = nextStepFor(lpo.status);
  const primaryAction = primaryActionFor(lpo.status);
  const steps = progressSteps(lpo.status);

  const initialTab = initialDetailTab(tabParam, action);

  const tabs: TabItem[] = [
    {
      id: "summary",
      label: "Summary",
      content: (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="surface-card p-4 sm:p-6 lg:col-span-2">
            <h2 className="mb-4 text-base font-bold text-[var(--foreground)]">
              Order details
            </h2>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Detail label="Client">{lpo.clientName}</Detail>
              <Detail label="Site code">{lpo.siteCode ?? "—"}</Detail>
              {lpo.clientSubEntityName ? (
                <Detail label="Client sub-entity">{lpo.clientSubEntityName}</Detail>
              ) : null}
              {lpo.clientTrn ? <Detail label="Client TRN">{lpo.clientTrn}</Detail> : null}
              <Detail label="Received date">
                {formatCalendarDate(lpo.receivedDate)}
              </Detail>
              {lpo.clientDeliveredAt ? (
                <Detail label="Client delivered at">
                  {formatBusinessDateTime(lpo.clientDeliveredAt)}
                </Detail>
              ) : null}
              <Detail label="Manufacturer">{lpo.manufacturer?.name ?? "Pending"}</Detail>
              <Detail label="Currency">{lpo.currency}</Detail>
              {lpo.paymentTerms ? (
                <Detail label="Payment terms">{lpo.paymentTerms}</Detail>
              ) : null}
              {lpo.deliveryTerms ? (
                <Detail label="Delivery terms">{lpo.deliveryTerms}</Detail>
              ) : null}
              {lpo.invoiceAddress ? (
                <Detail label="Invoice address" preserveLines>
                  {lpo.invoiceAddress}
                </Detail>
              ) : null}
              {lpo.deliveryAddress ? (
                <Detail label="Delivery address" preserveLines>
                  {lpo.deliveryAddress}
                </Detail>
              ) : null}
            </dl>
          </section>

          <section className="surface-card space-y-4 p-4 sm:p-6">
            <h2 className="text-base font-bold text-[var(--foreground)]">
              Files and links
            </h2>
            <div>
              <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                LPO document
              </p>
              <DocumentActions
                fileKey={lpo.originalFileKey}
                fileName={lpo.originalFileName}
              />
            </div>
            {lpo.productionFileKey && lpo.productionFileName ? (
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                  Production file
                </p>
                <DocumentActions
                  fileKey={lpo.productionFileKey}
                  fileName={lpo.productionFileName}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5 border-t border-[var(--border)] pt-4 text-sm">
              <Link
                href="/fabric"
                className="font-medium text-[var(--brand)] hover:underline"
              >
                Open the Fabric page
              </Link>
              <Link
                href="/documents"
                className="font-medium text-[var(--brand)] hover:underline"
              >
                Open all documents
              </Link>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Created by {createdByLabel} on {formatCalendarDate(lpo.createdAt)}
            </p>
          </section>
        </div>
      ),
    },
    {
      id: "lines",
      label: "Lines",
      count: lpo.lineItems.length,
      content:
        lpo.lineItems.length > 0 ? (
          <section className="surface-card p-4 sm:p-6">
            <h2 className="mb-4 text-base font-bold text-[var(--foreground)]">
              What the client ordered
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Article no.</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Unit price</th>
                    <th className="py-2 pr-3 text-right">Discount %</th>
                    <th className="py-2 pr-3 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {lpo.lineItems.map((line) => (
                    <tr key={line.id} className="border-b border-[var(--border)]">
                      <td className="py-2 pr-3 text-[var(--text-muted)]">
                        {line.position}
                      </td>
                      <td className="py-2 pr-3 text-[var(--foreground)]">
                        {line.description}
                        {line.category ? (
                          <span className="ml-2 text-xs text-[var(--text-muted)]">
                            ({line.category})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-muted)]">
                        {line.articleNo ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">{line.quantity}</td>
                      <td className="py-2 pr-3 text-right">
                        {Number(line.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {Number(line.discountPercent).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">
                        {Number(line.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-col items-end gap-1 border-t border-[var(--border)] pt-3 text-sm">
              <span className="text-[var(--text-muted)]">
                Subtotal:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {subtotal.toFixed(2)} {lpo.currency}
                </span>
              </span>
              <span className="text-[var(--text-muted)]">
                VAT ({DEFAULT_VAT_PERCENT}%):{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {vatAmount.toFixed(2)} {lpo.currency}
                </span>
              </span>
              <span className="text-[var(--foreground)]">
                Grand total:{" "}
                <span className="font-bold">
                  {grandTotal.toFixed(2)} {lpo.currency}
                </span>
              </span>
            </div>
          </section>
        ) : (
          <EmptyState title="No lines on this order">
            Edit the details to add what the client ordered.
          </EmptyState>
        ),
    },
    {
      id: "dates",
      label: "Dates",
      content: (
        <LpoDatesSection
          lpoId={lpo.id}
          manufacturerAssignmentAt={lpo.manufacturerAssignmentAt}
          productionDeadlineAt={lpo.productionDeadlineAt}
          clientDeliveryAt={lpo.clientDeliveryAt}
          dateChanges={lpo.dateChanges}
        />
      ),
    },
    {
      id: "fabric",
      label: "Fabric needed",
      content: (
        <LpoFabricRequirementsSection
          lpoId={lpo.id}
          rates={rates}
          requirements={requirements}
        />
      ),
    },
    {
      id: "production",
      label: "Production and delivery",
      content: (
        <LpoAssignmentPanel
          lpoId={lpo.id}
          status={lpo.status}
          manufacturerId={lpo.manufacturerId}
          manufacturerName={lpo.manufacturer?.name ?? null}
          productionFileKey={lpo.productionFileKey}
          manufacturers={manufacturers.map((m) => ({
            id: m.id,
            name: m.name,
          }))}
          usesBlobStorage={isUsingBlobStorage()}
        />
      ),
    },
    {
      id: "documents",
      label: "Documents",
      count: generatedDocuments.length,
      content: (
        <section className="surface-card space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="text-base font-bold text-[var(--foreground)]">
              Create a document
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Fills Deezano&apos;s own Excel templates from this LPO&apos;s details.
              Download the result as Excel to edit by hand, or convert it to PDF to send
              as-is.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <GenerateDocumentButton
              lpoId={lpo.id}
              label="Generate Quotation"
              pendingLabel="Generating…"
              action={generateQuotationAction}
            />
            <GenerateDocumentButton
              lpoId={lpo.id}
              label="Generate Tax Invoice"
              pendingLabel="Generating…"
              action={generateInvoiceAction}
            />
            <GenerateDocumentButton
              lpoId={lpo.id}
              label="Generate Delivery Note"
              pendingLabel="Generating…"
              action={generateDeliveryNoteAction}
              extraFields={
                <input
                  type="text"
                  name="notes"
                  placeholder="Notes (optional)"
                  className="min-h-11 flex-1 basis-64 rounded-md border border-zinc-300 px-3 text-sm"
                />
              }
            />
          </div>

          {generatedDocuments.length > 0 ? (
            <div className="overflow-x-auto border-t border-[var(--border)] pt-3">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Document number
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Type
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {generatedDocuments.map((doc) => (
                    <GeneratedDocumentRow
                      key={doc.id}
                      lpoId={lpo.id}
                      doc={{
                        id: doc.id,
                        documentNumber: doc.documentNumber,
                        type: documentTypeLabel(doc.type),
                        typeKey: doc.type,
                        generatedAtLabel: formatBusinessDateTime(doc.generatedAt),
                        generatedByLabel: doc.generatedBy.name ?? doc.generatedBy.email,
                        fileKey: doc.fileKey,
                        pdfFileKey: doc.pdfFileKey,
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border-t border-[var(--border)] pt-3 text-sm text-[var(--text-muted)]">
              Nothing has been generated for this order yet. Use the buttons above to
              create a quotation, tax invoice or delivery note.
            </p>
          )}
        </section>
      ),
    },
  ];

  return (
    <PageContainer
      title={heading}
      description={`LPO ${lpo.lpoNumber}`}
      breadcrumb={[
        { label: "Orders" },
        { label: "LPOs", href: "/lpo" },
        { label: lpo.lpoNumber },
      ]}
      actions={
        <>
          <Link href={`/lpo/${lpo.id}/edit`} className="btn-secondary">
            Edit details
          </Link>
          <OpenTabLink lpoId={lpo.id} tab={primaryAction.tab} className="btn-primary">
            {primaryAction.label}
          </OpenTabLink>
          <LpoActionsMenu
            lpoId={lpo.id}
            lpoNumber={lpo.lpoNumber}
            fileKey={lpo.originalFileKey}
            fileName={lpo.originalFileName}
            redirectTo="/lpo"
            includeDocumentActions={false}
          />
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <LpoStatusBadge status={lpo.status} />
          <p className="text-sm text-[var(--text-muted)]">
            {lpoStatusDetailLabel(lpo.status)} · Created by {createdByLabel}
          </p>
        </div>

        <section
          aria-label="Order at a glance"
          className="surface-card grid [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))] gap-px overflow-hidden bg-[var(--border)]"
        >
          <GlanceCell
            label="Client"
            value={lpo.clientName}
            sub={lpo.siteCode ?? undefined}
          />
          <GlanceCell
            label="Order total"
            value={`${lpo.currency} ${subtotal.toFixed(2)}`}
            sub={`${lpo.lineItems.length} ${lpo.lineItems.length === 1 ? "line" : "lines"}, before VAT`}
          />
          <GlanceCell
            label="Manufacturer"
            value={lpo.manufacturer?.name ?? "Not assigned yet"}
            sub={
              lpo.manufacturer
                ? `Assigned ${formatCalendarDate(lpo.manufacturerAssignmentAt)}`
                : `Assign by ${formatCalendarDate(lpo.manufacturerAssignmentAt)}`
            }
          />
          <GlanceCell
            label="Production deadline"
            value={formatCalendarDate(lpo.productionDeadlineAt)}
            sub={extensionLabel(lpo.dateChanges, "PRODUCTION_DEADLINE")}
          />
          <GlanceCell
            label="Client delivery"
            value={formatCalendarDate(lpo.clientDeliveryAt)}
            sub={extensionLabel(lpo.dateChanges, "CLIENT_DELIVERY")}
          />
        </section>

        <section
          aria-label="Next step"
          className="rounded-lg border border-[var(--brand)]/30 bg-[var(--brand-muted)] p-4 sm:p-5"
        >
          <p className="text-xs font-semibold tracking-wide text-[var(--brand)] uppercase">
            Next step
          </p>
          <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">
            {nextStep.title}
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
            {nextStep.body}
          </p>
          <ol className="mt-3 flex flex-wrap gap-2" aria-label="Order progress">
            {steps.map((step, index) => (
              <li key={step.label}>
                <Chip
                  tone={
                    step.state === "done"
                      ? "green"
                      : step.state === "current"
                        ? "amber"
                        : "gray"
                  }
                >
                  {step.state === "done" ? "✓" : index + 1} {step.label}
                </Chip>
              </li>
            ))}
          </ol>
        </section>

        <LpoDeepLinkFocus action={action} requestId={requestId} />

        <Tabs
          key={requestId ?? "initial"}
          label="LPO sections"
          tabs={tabs}
          defaultId={initialTab}
          syncParam="tab"
        />
      </div>
    </PageContainer>
  );
}

function Detail({
  label,
  preserveLines,
  children,
}: Readonly<{
  label: string;
  preserveLines?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm text-[var(--foreground)] ${preserveLines ? "whitespace-pre-line" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

function GlanceCell({
  label,
  value,
  sub,
}: Readonly<{ label: string; value: string; sub?: string }>) {
  return (
    <div className="bg-[var(--surface)] px-4 py-3">
      <p className="text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-[15px] font-bold break-words text-[var(--foreground)]">
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-[var(--text-muted)]">{sub}</p> : null}
    </div>
  );
}
