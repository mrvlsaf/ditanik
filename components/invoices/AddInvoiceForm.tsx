"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useRef, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { FormField, FormSection } from "@/components/lpo/lpo-form-parts";
import { CELL_INPUT_CLASS, INPUT_CLASS } from "@/components/ui/Field";
import { InfoTip } from "@/components/ui/InfoTip";
import { useDirectUploadOnSubmit } from "@/components/ui/useDirectUploadOnSubmit";
import {
  createSupplierInvoiceAction,
  type CreateSupplierInvoiceActionState,
} from "@/modules/invoices/application/create-supplier-invoice-action";
import {
  INVOICE_TYPE_INFO,
  SUPPLIER_INVOICE_CARD_TEXT,
  SUPPLIER_INVOICE_TYPES,
  type SupplierInvoiceType,
} from "@/modules/invoices/domain/invoice-types";
import {
  DEFAULT_SUPPLIER_VAT_PERCENT,
  previewSupplierInvoice,
} from "@/modules/invoices/domain/supplier-invoice-lines";
import { todayInputValue } from "@/lib/dates/today-input";
import { formatAmount } from "@/lib/format-amount";

const initialState: CreateSupplierInvoiceActionState = { ok: false, message: null };

type LineRow = {
  description: string;
  quantity: string;
  unitPrice: string;
  vatPercent: string;
};

const EMPTY_LINE: LineRow = {
  description: "",
  quantity: "",
  unitPrice: "",
  vatPercent: String(DEFAULT_SUPPLIER_VAT_PERCENT),
};

export function AddInvoiceForm({
  initialType,
  usesBlobStorage,
}: Readonly<{ initialType: SupplierInvoiceType; usesBlobStorage: boolean }>) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<SupplierInvoiceType>(initialType);
  const [lines, setLines] = useState<LineRow[]>([{ ...EMPTY_LINE }]);
  const today = todayInputValue();

  const [state, formAction, isPending] = useActionState(
    async (
      previous: CreateSupplierInvoiceActionState,
      formData: FormData,
    ): Promise<CreateSupplierInvoiceActionState> => {
      const result = await createSupplierInvoiceAction(previous, formData);
      if (result.ok) {
        router.push("/invoices");
      }
      return result;
    },
    initialState,
  );

  const {
    onSubmit: onDirectUploadSubmit,
    isUploadingFile,
    uploadError,
  } = useDirectUploadOnSubmit({
    formAction,
    formRef,
    fileFieldName: "invoiceFile",
    fileRefFieldName: "invoiceFileRef",
    folder: "supplier-invoices",
    usesBlobStorage,
  });
  useGlobalPending(isPending || isUploadingFile);

  const preview = useMemo(() => previewSupplierInvoice(lines), [lines]);
  const typeLabel = INVOICE_TYPE_INFO[type].label;
  const text = SUPPLIER_INVOICE_CARD_TEXT[type];

  function updateLine(index: number, patch: Partial<LineRow>) {
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onDirectUploadSubmit}
      className="flex flex-wrap items-start gap-6"
    >
      <input type="hidden" name="type" value={type} />
      <input
        type="hidden"
        name="linesJson"
        value={JSON.stringify(
          lines.map((row) => ({
            description: row.description,
            quantity: Number(row.quantity),
            unitPrice: Number(row.unitPrice),
            vatPercent: row.vatPercent.trim() === "" ? 0 : Number(row.vatPercent),
          })),
        )}
      />

      <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
        <FormSection step={1} title="What kind of invoice is it?">
          <div
            role="group"
            aria-label="Kind of invoice"
            className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]"
          >
            {SUPPLIER_INVOICE_TYPES.map((key) => {
              const selected = key === type;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setType(key)}
                  className={`flex min-h-11 flex-col items-start gap-1.5 rounded-xl border bg-white px-4 py-3.5 text-left hover:bg-[#f7f7f5] ${
                    selected
                      ? "border-2 border-[#1a1a1a] bg-[#fbfbf9] px-[15px] py-[13px]"
                      : "border-[#b9beb6]"
                  }`}
                >
                  <span className="text-[15px] font-bold">
                    {INVOICE_TYPE_INFO[key].label}
                  </span>
                  <span className="text-[13px] leading-snug text-[#4d544d]">
                    {SUPPLIER_INVOICE_CARD_TEXT[key].description}
                  </span>
                </button>
              );
            })}
          </div>
        </FormSection>

        <FormSection step={2} title="Invoice details">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
            <FormField label="Supplier name" htmlFor="si-supplier">
              <input
                id="si-supplier"
                name="supplierName"
                required
                placeholder={text.supplierPlaceholder}
                className={INPUT_CLASS}
              />
            </FormField>
            <FormField label="Invoice reference" htmlFor="si-ref" optional>
              <input
                id="si-ref"
                name="invoiceRef"
                placeholder={text.refPlaceholder}
                className={INPUT_CLASS}
              />
            </FormField>
            <FormField label="Date received" htmlFor="si-date">
              <input
                id="si-date"
                type="date"
                name="receivedDate"
                required
                defaultValue={today}
                max={today}
                className={INPUT_CLASS}
              />
            </FormField>
            <FormField
              label="Invoice file (PDF)"
              htmlFor="si-file"
              tip="The PDF is required. Keep the supplier's original invoice here so you can open it later for your VAT records."
            >
              <input
                id="si-file"
                type="file"
                name="invoiceFile"
                accept="application/pdf,.pdf"
                required
                className="file-btn"
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection
          step={3}
          title="Invoice lines"
          help="Copy the lines from the invoice. Totals update as you type."
        >
          <div className="-mx-5 overflow-x-auto">
            <table className="table-stack min-w-full text-sm">
              <thead className="border-y border-[var(--border)] bg-[var(--surface-muted)] text-left text-xs font-bold tracking-wide text-[#4d544d] uppercase">
                <tr>
                  <th scope="col" className="px-3 py-2.5 first:pl-5">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Qty
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Unit price
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    VAT %
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right">
                    Line total
                  </th>
                  <th scope="col" className="px-3 py-2.5 pr-5">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef0ea]">
                {lines.map((row, index) => (
                  <tr key={index}>
                    <td data-label="Description" className="px-3 py-2 first:pl-5">
                      <input
                        required
                        aria-label={`Description, line ${index + 1}`}
                        value={row.description}
                        onChange={(e) =>
                          updateLine(index, { description: e.target.value })
                        }
                        className={`${CELL_INPUT_CLASS} min-w-52`}
                      />
                    </td>
                    <td data-label="Qty" className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        aria-label={`Quantity, line ${index + 1}`}
                        value={row.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        className={`${CELL_INPUT_CLASS} w-24 text-right`}
                      />
                    </td>
                    <td data-label="Unit price" className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        aria-label={`Unit price, line ${index + 1}`}
                        value={row.unitPrice}
                        onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                        className={`${CELL_INPUT_CLASS} w-28 text-right`}
                      />
                    </td>
                    <td data-label="VAT %" className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        aria-label={`VAT percent, line ${index + 1}`}
                        value={row.vatPercent}
                        onChange={(e) =>
                          updateLine(index, { vatPercent: e.target.value })
                        }
                        className={`${CELL_INPUT_CLASS} w-20 text-right`}
                      />
                    </td>
                    <td
                      data-label="Line total"
                      className="px-3 py-2 text-right font-medium whitespace-nowrap"
                    >
                      {preview.lineAmounts[index] != null
                        ? formatAmount(preview.lineAmounts[index]!)
                        : "—"}
                    </td>
                    <td data-label="" className="px-3 py-2 pr-5">
                      {lines.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLines((rows) => rows.filter((_, i) => i !== index))
                          }
                          className="btn-danger-outline"
                          aria-label={`Remove line ${index + 1}`}
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setLines((rows) => [...rows, { ...EMPTY_LINE }])}
              className="btn-secondary"
            >
              Add a line
            </button>
            <InfoTip label="What VAT rate should I use?">
              Usually 5%. Change it only if the invoice shows a different rate, or none.
            </InfoTip>
          </div>
        </FormSection>
      </div>

      <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 lg:sticky lg:top-6">
        <section
          className="surface-card flex flex-col gap-3.5 p-5"
          aria-labelledby="si-summary"
        >
          <h2 id="si-summary" className="text-[17px] font-bold">
            Summary
          </h2>
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#4d544d]">Type</dt>
              <dd className="font-semibold">{typeLabel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#4d544d]">Lines</dt>
              <dd className="font-semibold">{lines.length}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[#eef0ea] pt-2.5">
              <dt className="text-[#4d544d]">Subtotal</dt>
              <dd>{formatAmount(preview.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#4d544d]">VAT</dt>
              <dd>{formatAmount(preview.vatAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-base font-bold">
              <dt>Total (AED)</dt>
              <dd>{formatAmount(preview.total)}</dd>
            </div>
          </dl>

          {uploadError ? (
            <p className="text-sm text-red-700" role="status">
              {uploadError}
            </p>
          ) : null}
          {state.message ? (
            <p
              className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
              role="status"
            >
              {state.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending || isUploadingFile}
            className="btn-primary min-h-11 w-full"
          >
            {isUploadingFile ? "Uploading…" : isPending ? "Saving…" : "Save invoice"}
          </button>
          <Link href="/invoices" className="btn-secondary min-h-11 w-full">
            Cancel
          </Link>
        </section>

        <section className="surface-card flex flex-col gap-2 p-5">
          <h2 className="text-[15px] font-bold">What happens next</h2>
          <p className="text-[13px] leading-snug text-[#4d544d]">
            The invoice is saved in Invoices with a {typeLabel.toLowerCase()} tag. It is
            not linked to any LPO or manufacturer. You can filter by type or month, and
            its VAT is counted in the totals at the top of the list.
          </p>
        </section>
      </aside>
    </form>
  );
}
