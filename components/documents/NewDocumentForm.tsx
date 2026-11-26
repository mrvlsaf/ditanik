"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { FormSection } from "@/components/lpo/lpo-form-parts";
import {
  CELL_INPUT_CLASS,
  Field,
  INPUT_CLASS,
  TEXTAREA_CLASS,
} from "@/components/ui/Field";
import { editQuotationAction } from "@/modules/documents/application/edit-quotation-action";
import {
  generateIndependentDocumentAction,
  type GenerateIndependentDocumentActionState,
} from "@/modules/documents/application/generate-independent-document-action";
import type { QuotationEditInitial } from "@/modules/documents/domain/quotation-edit";
import {
  DOCUMENT_TYPE_LABEL,
  INDEPENDENT_DOCUMENT_TYPES,
  type IndependentDocumentType,
} from "@/modules/documents/domain/independent-document";
import { DEFAULT_VAT_PERCENT } from "@/modules/lpo/domain/line-items";
import {
  EMPTY_LINE_ITEM_ROW,
  summariseLineItemRows,
  type LpoLineItemRow,
} from "@/modules/lpo/domain/line-item-rows";
import { fileUrl } from "@/lib/files/file-url";
import { formatAmount } from "@/lib/format-amount";
import { PaymentTermsInput } from "@/components/documents/PaymentTermsInput";

const initialState: GenerateIndependentDocumentActionState = {
  ok: false,
  message: null,
};

const DOCUMENT_TYPE_HELP: Record<IndependentDocumentType, string> = {
  QUOTATION: "A price offer, sent before an order.",
  TAX_INVOICE: "A request for payment, usually after delivery.",
  DELIVERY_NOTE: "Lists what goes out with the delivery.",
};

/** Set when an existing quotation is being edited instead of a new document made. */
export type QuotationEditConfig = {
  documentId: string;
  documentNumber: string;
  /** Edited on the day it was made, so it keeps its number. */
  sameDay: boolean;
  createdLabel: string;
  initial: QuotationEditInitial;
};

function DocumentForm({
  siteCodeSuggestions,
  edit,
  onAnother,
}: Readonly<{
  siteCodeSuggestions: string[];
  edit?: QuotationEditConfig;
  onAnother: () => void;
}>) {
  const initial = edit?.initial;
  const [type, setType] = useState<IndependentDocumentType>("QUOTATION");
  const [clientName, setClientName] = useState(initial?.clientName ?? "");
  const [lines, setLines] = useState<LpoLineItemRow[]>(
    initial && initial.lines.length > 0 ? initial.lines : [{ ...EMPTY_LINE_ITEM_ROW }],
  );
  const [state, formAction, isPending] = useActionState(
    edit ? editQuotationAction : generateIndependentDocumentAction,
    initialState,
  );
  useGlobalPending(isPending);

  const { rowTotals, subtotal, vatAmount, grandTotal, allRowsValid } =
    summariseLineItemRows(lines);
  const typeLabel = DOCUMENT_TYPE_LABEL[type];
  const typeLower = typeLabel.toLowerCase();

  function updateLine(index: number, patch: Partial<LpoLineItemRow>) {
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  if (state.ok && state.fileKey) {
    return (
      <div className="surface-card flex max-w-[760px] flex-col gap-4 p-5 sm:p-6">
        <p className="text-base font-bold text-[var(--brand)]" role="status">
          {state.message}
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          {edit
            ? "It's saved in Documents, where you can download it again or convert it to PDF."
            : "It's saved in Documents, where you can download it again or convert it to PDF. To change a quotation later, use Edit on its row in Documents."}
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={fileUrl(state.fileKey, true)} className="btn-primary">
            Download {state.fileName ?? "document.xlsx"}
          </a>
          <Link href="/documents" className="btn-secondary">
            View in Documents
          </Link>
          {edit ? null : (
            <button type="button" onClick={onAnother} className="btn-secondary">
              Create another
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-start gap-6">
      <input
        type="hidden"
        name="lineItemsJson"
        value={JSON.stringify(
          lines.map((row) => ({
            category: type === "QUOTATION" && row.category ? row.category : undefined,
            description: row.description,
            quantity: Number(row.quantity),
            unitPrice: Number(row.unitPrice),
            discountPercent: row.discountPercent
              ? Number(row.discountPercent)
              : undefined,
          })),
        )}
      />

      {edit ? (
        <>
          <input type="hidden" name="documentId" value={edit.documentId} />
          <input type="hidden" name="type" value="QUOTATION" />
        </>
      ) : null}

      <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
        {edit ? (
          <FormSection step={1} title={`Editing ${edit.documentNumber}`}>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">
              {edit.sameDay
                ? "This quotation was made today, so saving keeps its number and date and replaces its file. A PDF made from the old file is removed; convert it again afterwards."
                : `This quotation was made on ${edit.createdLabel}. Saving replaces it with the edited version, dated today and with a new number. ${edit.documentNumber} will no longer exist.`}
            </p>
          </FormSection>
        ) : (
          <FormSection step={1} title="What are you making?">
            <div
              role="radiogroup"
              aria-label="Document type"
              className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]"
            >
              {INDEPENDENT_DOCUMENT_TYPES.map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-3.5 focus-within:ring-2 focus-within:ring-[var(--ring)] ${
                    type === value
                      ? "border-[var(--brand)] bg-[var(--brand-muted)]"
                      : "border-[var(--border)] bg-white hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={value}
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="sr-only"
                  />
                  <span className="text-[15px] font-bold">
                    {DOCUMENT_TYPE_LABEL[value]}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {DOCUMENT_TYPE_HELP[value]}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Dated today and numbered like every other document (SITE-TYPE-DDMMYYYY-NN).
              Not linked to any LPO.
              {type === "QUOTATION"
                ? " Validity (30 days) is added automatically, and the terms come from your company profile."
                : null}
            </p>
          </FormSection>
        )}

        <FormSection step={2} title="Who is it for?">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            <Field
              label="Site code"
              hint="Letters, numbers and dashes, up to 20."
              tip="A short code for the customer site. It starts the document number. Pick one you used before, or type a new one."
            >
              <input
                name="siteCode"
                required
                defaultValue={initial?.siteCode}
                readOnly={edit?.sameDay}
                list="site-code-suggestions"
                maxLength={20}
                autoComplete="off"
                className={INPUT_CLASS}
                placeholder="e.g. AHO"
              />
              <datalist id="site-code-suggestions">
                {siteCodeSuggestions.map((code) => (
                  <option key={code} value={code} />
                ))}
              </datalist>
            </Field>
            <Field label="Client name">
              <input
                name="clientName"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Branch or sub-entity" optional>
              <input
                name="clientSubEntityName"
                defaultValue={initial?.clientSubEntityName}
                className={INPUT_CLASS}
              />
            </Field>
            <Field
              label="Client TRN"
              optional
              tip="The client's tax registration number. Optional, but tax invoices usually need it."
            >
              <input
                name="clientTrn"
                defaultValue={initial?.clientTrn}
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <Field
            label={
              type === "DELIVERY_NOTE"
                ? "Delivery address"
                : type === "QUOTATION"
                  ? "Customer address"
                  : "Invoice address"
            }
          >
            <textarea
              name="address"
              required
              defaultValue={initial?.address}
              rows={3}
              className={TEXTAREA_CLASS}
              placeholder="One line per row. Each line is printed on its own line."
            />
          </Field>
        </FormSection>

        <FormSection step={3} title={`Details for this ${typeLower}`}>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            {type !== "QUOTATION" ? (
              <Field
                label="Customer LPO number"
                optional
                tip="The order number your customer gave you. It is printed on the document only and does not link to an LPO here."
              >
                <input name="lpoReference" className={INPUT_CLASS} />
              </Field>
            ) : (
              <Field
                label="Payment terms"
                optional
                hint="Printed in bold in the Payment Terms clause. Leave blank to use the wording in your company terms and conditions."
              >
                <PaymentTermsInput initialValue={initial?.paymentTerms} />
              </Field>
            )}
            {type === "DELIVERY_NOTE" ? (
              <>
                <Field
                  label="Note type"
                  tip="The kind of delivery this is. Job work is the usual choice."
                >
                  <input
                    name="noteType"
                    defaultValue="Job work"
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="Dispatch date" hint="Leave blank to use today.">
                  <input type="date" name="dispatchDate" className={INPUT_CLASS} />
                </Field>
                <Field label="Notes" optional>
                  <input
                    name="notes"
                    className={INPUT_CLASS}
                    placeholder="Printed on the delivery note"
                  />
                </Field>
              </>
            ) : null}
          </div>
        </FormSection>

        <FormSection
          step={4}
          title="Items"
          help="Add 1 to 100 lines. Totals update as you type."
        >
          <div className="overflow-x-auto">
            <table className="table-stack w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                  <th scope="col" className="py-2 pr-3">
                    Description
                  </th>
                  {type === "QUOTATION" ? (
                    <th scope="col" className="py-2 pr-3">
                      Category
                    </th>
                  ) : null}
                  <th scope="col" className="py-2 pr-3">
                    Qty
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Unit price
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Discount %
                  </th>
                  <th scope="col" className="py-2 pr-3 text-right">
                    Line total
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((row, index) => (
                  <tr key={index}>
                    <td data-label="Description" className="py-1 pr-3">
                      <input
                        required
                        value={row.description}
                        onChange={(e) =>
                          updateLine(index, { description: e.target.value })
                        }
                        aria-label={`Description, line ${index + 1}`}
                        className={`${CELL_INPUT_CLASS} min-w-52`}
                      />
                    </td>
                    {type === "QUOTATION" ? (
                      <td data-label="Category" className="py-1 pr-3">
                        <input
                          value={row.category}
                          onChange={(e) =>
                            updateLine(index, { category: e.target.value })
                          }
                          aria-label={`Category, line ${index + 1}`}
                          className={`${CELL_INPUT_CLASS} w-28`}
                        />
                      </td>
                    ) : null}
                    <td data-label="Qty" className="py-1 pr-3">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={row.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        aria-label={`Quantity, line ${index + 1}`}
                        className={`${CELL_INPUT_CLASS} w-24`}
                      />
                    </td>
                    <td data-label="Unit price" className="py-1 pr-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={row.unitPrice}
                        onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                        aria-label={`Unit price, line ${index + 1}`}
                        className={`${CELL_INPUT_CLASS} w-28`}
                      />
                    </td>
                    <td data-label="Discount %" className="py-1 pr-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={row.discountPercent}
                        onChange={(e) =>
                          updateLine(index, { discountPercent: e.target.value })
                        }
                        aria-label={`Discount percent, line ${index + 1}`}
                        className={`${CELL_INPUT_CLASS} w-24`}
                      />
                    </td>
                    <td
                      data-label="Line total"
                      className="py-1 pr-3 text-right font-semibold"
                    >
                      {rowTotals[index] != null ? formatAmount(rowTotals[index]!) : "—"}
                    </td>
                    <td data-label="" className="py-1 text-right">
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLines((rows) => rows.filter((_, i) => i !== index))
                          }
                          className="btn-danger-outline text-xs"
                        >
                          Remove
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setLines((rows) => [...rows, { ...EMPTY_LINE_ITEM_ROW }])}
              disabled={lines.length >= 100}
              className="btn-secondary"
            >
              Add a line
            </button>
          </div>
        </FormSection>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-20">
        <section
          className="surface-card flex flex-col gap-3.5 p-5"
          aria-labelledby="doc-summary"
        >
          <h2 id="doc-summary" className="text-[17px] font-bold">
            Summary
          </h2>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Document</dt>
              <dd className="font-semibold">{typeLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Client</dt>
              <dd className="text-right font-semibold">{clientName.trim() || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Lines</dt>
              <dd className="font-semibold">{lines.length}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2.5">
              <dt className="text-[var(--text-muted)]">Subtotal</dt>
              <dd>{formatAmount(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">VAT {DEFAULT_VAT_PERCENT}%</dt>
              <dd>{formatAmount(vatAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-base font-bold">
              <dt>Total (AED)</dt>
              <dd>{formatAmount(grandTotal)}</dd>
            </div>
          </dl>
          {!allRowsValid ? (
            <p className="text-xs text-amber-800">
              Complete every line (description, qty, unit price) to see accurate totals.
              Incomplete lines are left out above.
            </p>
          ) : null}
          {state.message && !state.ok ? (
            <p className="text-sm font-medium text-[var(--danger)]" role="status">
              {state.message}
            </p>
          ) : null}
          <button type="submit" disabled={isPending} className="btn-primary w-full">
            {isPending
              ? edit
                ? "Saving…"
                : "Creating…"
              : edit
                ? edit.sameDay
                  ? "Save changes"
                  : "Save and renumber"
                : `Create ${typeLower}`}
          </button>
        </section>
        <section className="surface-card flex flex-col gap-2 p-5">
          <h2 className="text-[15px] font-bold">What happens next</h2>
          <p className="text-sm text-[var(--text-muted)]">
            {edit
              ? edit.sameDay
                ? "The quotation keeps its number and date, and its file is replaced in Documents."
                : "The quotation is replaced in Documents by the edited version, with today's date and a new number. The old number is retired."
              : "The document gets its number, such as ABC-… with today's date, and is saved in Documents. You can download it or convert it to PDF there, straight away."}
          </p>
        </section>
      </aside>
    </form>
  );
}

/** "New document" form: Quotation / Tax Invoice / Delivery Note without an LPO. */
export function NewDocumentForm({
  siteCodeSuggestions,
  edit,
}: Readonly<{ siteCodeSuggestions: string[]; edit?: QuotationEditConfig }>) {
  // Remounting the form (new key) is the reset: it clears the action state,
  // the typed fields and the line items in one go.
  const [formKey, setFormKey] = useState(0);
  return (
    <DocumentForm
      key={formKey}
      siteCodeSuggestions={siteCodeSuggestions}
      edit={edit}
      onAnother={() => setFormKey((key) => key + 1)}
    />
  );
}
