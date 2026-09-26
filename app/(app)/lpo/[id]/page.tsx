import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { LpoActionsMenu } from "@/components/lpo/LpoActionsMenu";
import { LpoAssignmentPanel } from "@/components/lpo/LpoAssignmentPanel";
import { LpoDatesSection } from "@/components/lpo/LpoDatesSection";
import { LpoDeepLinkFocus } from "@/components/lpo/LpoDeepLinkFocus";
import { LpoFabricRequirementsSection } from "@/components/lpo/LpoFabricRequirementsSection";
import { LpoStatusBadge } from "@/components/lpo/LpoStatusBadge";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { GenerateDocumentButton } from "@/components/documents/GenerateDocumentButton";
import { GeneratedDocumentRow } from "@/components/documents/GeneratedDocumentRow";
import { formatBusinessDateTime, formatCalendarDate } from "@/lib/dates/format";
import { listActiveRates } from "@/modules/fabric/application/consumption";
import { generateQuotationAction } from "@/modules/documents/application/generate-quotation-action";
import { generateQuoteAction } from "@/modules/documents/application/generate-quote-action";
import { generateInvoiceAction } from "@/modules/documents/application/generate-invoice-action";
import { generateDeliveryNoteAction } from "@/modules/documents/application/generate-delivery-note-action";
import { listGeneratedDocumentsForLpo } from "@/modules/documents/application/list-generated-documents";
import { listForLpo } from "@/modules/fabric/application/lpo-fabric-requirements";
import { getLpoById } from "@/modules/lpo/application/get-lpo";
import {
  DEFAULT_VAT_PERCENT,
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateVatAmount,
} from "@/modules/lpo/domain/line-items";
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

export default async function LpoDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ action?: string | string[] }>;
}>) {
  const { id } = await params;
  const query = await searchParams;
  const action = parseActionParam(query.action);
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

  return (
    <PageContainer title={`LPO ${lpo.lpoNumber}`} description={lpo.nickname}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/lpo"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to LPO dashboard
        </Link>
        <LpoActionsMenu
          lpoId={lpo.id}
          lpoNumber={lpo.lpoNumber}
          fileKey={lpo.originalFileKey}
          fileName={lpo.originalFileName}
          redirectTo="/lpo"
          includeDocumentActions={false}
        />
      </div>

      <LpoDeepLinkFocus action={action} />

      <div className="space-y-8">
        <section className="surface-card p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <LpoStatusBadge status={lpo.status} />
            <p className="text-sm text-zinc-500">
              {lpoStatusDetailLabel(lpo.status)} · Created by {createdByLabel}
            </p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Client
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{lpo.clientName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Manufacturer
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {lpo.manufacturer?.name ?? "Pending"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Received date
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">
                {formatCalendarDate(lpo.receivedDate)}
              </dd>
            </div>
            {lpo.clientDeliveredAt ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Client delivered at
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">
                  {formatBusinessDateTime(lpo.clientDeliveredAt)}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Site code
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{lpo.siteCode ?? "—"}</dd>
            </div>
            {lpo.clientSubEntityName ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Client sub-entity
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">{lpo.clientSubEntityName}</dd>
              </div>
            ) : null}
            {lpo.clientTrn ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Client TRN
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">{lpo.clientTrn}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                Currency
              </dt>
              <dd className="mt-1 text-sm text-zinc-900">{lpo.currency}</dd>
            </div>
            {lpo.paymentTerms ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Payment terms
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">{lpo.paymentTerms}</dd>
              </div>
            ) : null}
            {lpo.deliveryTerms ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Delivery terms
                </dt>
                <dd className="mt-1 text-sm text-zinc-900">{lpo.deliveryTerms}</dd>
              </div>
            ) : null}
            {lpo.invoiceAddress ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Invoice address
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-zinc-900">
                  {lpo.invoiceAddress}
                </dd>
              </div>
            ) : null}
            {lpo.deliveryAddress ? (
              <div>
                <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Delivery address
                </dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-zinc-900">
                  {lpo.deliveryAddress}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 space-y-4 border-t border-zinc-100 pt-4">
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                LPO document
              </p>
              <DocumentActions
                fileKey={lpo.originalFileKey}
                fileName={lpo.originalFileName}
              />
            </div>
            {lpo.productionFileKey && lpo.productionFileName ? (
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Production file
                </p>
                <DocumentActions
                  fileKey={lpo.productionFileKey}
                  fileName={lpo.productionFileName}
                />
              </div>
            ) : null}
          </div>
        </section>

        {lpo.lineItems.length > 0 ? (
          <section className="surface-card p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-medium text-zinc-800">
              Commercial line items
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
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
                    <tr key={line.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-3 text-zinc-500">{line.position}</td>
                      <td className="py-2 pr-3 text-zinc-900">
                        {line.description}
                        {line.category ? (
                          <span className="ml-2 text-xs text-zinc-500">
                            ({line.category})
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3 text-zinc-700">{line.articleNo ?? "—"}</td>
                      <td className="py-2 pr-3 text-right text-zinc-900">
                        {line.quantity}
                      </td>
                      <td className="py-2 pr-3 text-right text-zinc-900">
                        {Number(line.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right text-zinc-900">
                        {Number(line.discountPercent).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-zinc-900">
                        {Number(line.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const subtotal = calculateLineItemsSubtotal(
                lpo.lineItems.map((line) => ({ lineTotal: Number(line.lineTotal) })),
              );
              const vatAmount = calculateVatAmount(subtotal);
              const grandTotal = calculateGrandTotal(subtotal, vatAmount);
              return (
                <div className="mt-4 flex flex-col items-end gap-1 border-t border-zinc-100 pt-3 text-sm">
                  <span className="text-zinc-600">
                    Subtotal:{" "}
                    <span className="font-medium text-zinc-900">
                      {subtotal.toFixed(2)} {lpo.currency}
                    </span>
                  </span>
                  <span className="text-zinc-600">
                    VAT ({DEFAULT_VAT_PERCENT}%):{" "}
                    <span className="font-medium text-zinc-900">
                      {vatAmount.toFixed(2)} {lpo.currency}
                    </span>
                  </span>
                  <span className="text-zinc-800">
                    Grand total:{" "}
                    <span className="font-semibold text-zinc-900">
                      {grandTotal.toFixed(2)} {lpo.currency}
                    </span>
                  </span>
                </div>
              );
            })()}
          </section>
        ) : null}

        <section className="surface-card space-y-4 p-4 sm:p-6">
          <div>
            <h2 className="text-sm font-medium text-zinc-800">Generated documents</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Fills the real Deezano workbooks — pixel-accurate templates taken straight
              from Deezano&apos;s own Excel files — from this LPO&apos;s stored details.
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
              label="Generate Quote"
              pendingLabel="Generating…"
              action={generateQuoteAction}
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
            <div className="overflow-x-auto border-t border-zinc-100 pt-3">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    <th className="py-2 pr-3">Document #</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Generated</th>
                    <th className="py-2 pr-3">By</th>
                    <th className="py-2 pr-3" />
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
                        type: doc.type,
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
          ) : null}
        </section>

        <LpoDatesSection
          lpoId={lpo.id}
          manufacturerAssignmentAt={lpo.manufacturerAssignmentAt}
          productionDeadlineAt={lpo.productionDeadlineAt}
          clientDeliveryAt={lpo.clientDeliveryAt}
          dateChanges={lpo.dateChanges}
        />

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

        <LpoFabricRequirementsSection
          lpoId={lpo.id}
          rates={rates}
          requirements={requirements}
        />
      </div>
    </PageContainer>
  );
}
