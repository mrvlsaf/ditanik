"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import {
  generateIndependentDocumentAction,
  type GenerateIndependentDocumentActionState,
} from "@/modules/documents/application/generate-independent-document-action";
import {
  DOCUMENT_TYPE_LABEL,
  INDEPENDENT_DOCUMENT_TYPES,
  type IndependentDocumentType,
} from "@/modules/documents/domain/independent-document";
import {
  DEFAULT_VAT_PERCENT,
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateLineTotal,
  calculateVatAmount,
} from "@/modules/lpo/domain/line-items";

const initialState: GenerateIndependentDocumentActionState = {
  ok: false,
  message: null,
};

type LineRow = {
  category: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

const emptyLine: LineRow = {
  category: "",
  description: "",
  quantity: "",
  unitPrice: "",
  discountPercent: "",
};

function fileDownloadUrl(fileKey: string): string {
  const params = new URLSearchParams({ key: fileKey, download: "1" });
  return `/api/files?${params.toString()}`;
}

/** Best-effort live total for one row; null while the row is incomplete/invalid. */
function tryLineTotal(row: LineRow): number | null {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unitPrice);
  const discountPercent = row.discountPercent ? Number(row.discountPercent) : 0;
  if (!row.quantity || !row.unitPrice) return null;
  try {
    return calculateLineTotal({ quantity, unitPrice, discountPercent });
  } catch {
    return null;
  }
}

const inputClass = "min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm";

function DocumentForm({
  siteCodeSuggestions,
  onAnother,
}: Readonly<{
  siteCodeSuggestions: string[];
  onAnother: () => void;
}>) {
  const [type, setType] = useState<IndependentDocumentType>("QUOTATION");
  const [lines, setLines] = useState<LineRow[]>([{ ...emptyLine }]);
  const [state, formAction, isPending] = useActionState(
    generateIndependentDocumentAction,
    initialState,
  );
  useGlobalPending(isPending);

  const rowTotals = lines.map(tryLineTotal);
  const subtotal = calculateLineItemsSubtotal(
    rowTotals
      .filter((total): total is number => total != null)
      .map((lineTotal) => ({ lineTotal })),
  );
  const vatAmount = calculateVatAmount(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, vatAmount);
  const allRowsValid = rowTotals.every((total) => total != null);

  function updateLine(index: number, patch: Partial<LineRow>) {
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  if (state.ok && state.fileKey) {
    return (
      <div className="space-y-4 surface-card p-4 sm:p-6">
        <p className="text-sm font-medium text-emerald-700" role="status">
          {state.message}
        </p>
        <p className="text-sm text-zinc-600">
          It&apos;s saved in Documents, where you can download it again or convert it to
          PDF. Generated documents can&apos;t be edited — to correct one, create a new
          document.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={fileDownloadUrl(state.fileKey)} className="btn-primary min-h-11">
            Download {state.fileName ?? "document.xlsx"}
          </a>
          <Link href="/documents" className="btn-secondary min-h-11">
            View in Documents
          </Link>
          <button type="button" onClick={onAnother} className="btn-secondary min-h-11">
            Create another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6 surface-card p-4 sm:p-6">
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

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-800">Document type</h3>
        <div className="flex flex-wrap gap-2">
          {INDEPENDENT_DOCUMENT_TYPES.map((value) => (
            <label
              key={value}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 text-sm font-medium ${
                type === value
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
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
              {DOCUMENT_TYPE_LABEL[value]}
            </label>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          Dated today. Numbered like every other document (SITE-TYPE-DDMMYYYY-NN) and not
          linked to any LPO.
          {type === "QUOTATION"
            ? " Validity (30 days) and the standard terms are added automatically."
            : null}
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">Client details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Site code</span>
            <input
              name="siteCode"
              required
              list="site-code-suggestions"
              maxLength={20}
              autoComplete="off"
              className={inputClass}
              placeholder="e.g. AHO"
            />
            <datalist id="site-code-suggestions">
              {siteCodeSuggestions.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
            <span className="mt-1 block text-xs text-zinc-500">
              Used in the document number. Pick a previous code or type a new one.
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Client name</span>
            <input name="clientName" required className={inputClass} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Client sub-entity / department
            </span>
            <input
              name="clientSubEntityName"
              className={inputClass}
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Client TRN</span>
            <input name="clientTrn" className={inputClass} placeholder="Optional" />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-800">
              {type === "DELIVERY_NOTE" ? "Delivery address" : "Invoice address"}
            </span>
            <textarea
              name="address"
              required
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="One line per row — the first line is printed on its own line"
            />
          </label>

          {type !== "QUOTATION" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">
                {type === "TAX_INVOICE" ? "Client reference" : "LPO reference"}
              </span>
              <input name="lpoReference" className={inputClass} placeholder="Optional" />
              <span className="mt-1 block text-xs text-zinc-500">
                Printed in the LPO reference box; leave blank if there isn&apos;t one.
              </span>
            </label>
          ) : null}

          {type === "DELIVERY_NOTE" ? (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">Note type</span>
                <input name="noteType" defaultValue="Job work" className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-800">
                  Dispatch date
                </span>
                <input type="date" name="dispatchDate" className={inputClass} />
                <span className="mt-1 block text-xs text-zinc-500">
                  Leave blank to use today.
                </span>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-medium text-zinc-800">Notes</span>
                <input name="notes" className={inputClass} placeholder="Optional" />
              </label>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-800">Line items</h3>
          <button
            type="button"
            onClick={() => setLines((rows) => [...rows, { ...emptyLine }])}
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            + Add line
          </button>
        </div>

        {lines.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <label
              className={`block text-sm ${type === "QUOTATION" ? "lg:col-span-2" : "lg:col-span-3"}`}
            >
              <span className="mb-1 block text-zinc-700">Description</span>
              <input
                required
                value={row.description}
                onChange={(e) => updateLine(index, { description: e.target.value })}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            {type === "QUOTATION" ? (
              <label className="block text-sm">
                <span className="mb-1 block text-zinc-700">Category</span>
                <input
                  value={row.category}
                  onChange={(e) => updateLine(index, { category: e.target.value })}
                  className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                />
              </label>
            ) : null}
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Qty</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={row.quantity}
                onChange={(e) => updateLine(index, { quantity: e.target.value })}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Unit price</span>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={row.unitPrice}
                onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Discount %</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={row.discountPercent}
                  onChange={(e) => updateLine(index, { discountPercent: e.target.value })}
                  className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                />
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))}
                    className="btn-danger-outline shrink-0 text-xs"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </label>
            <div className="text-xs text-zinc-500 lg:col-span-6">
              Line total: {rowTotals[index] != null ? rowTotals[index]!.toFixed(2) : "—"}
            </div>
          </div>
        ))}

        <div className="flex flex-col items-end gap-1 border-t border-zinc-100 pt-3 text-sm">
          <span className="text-zinc-600">
            Subtotal:{" "}
            <span className="font-medium text-zinc-900">{subtotal.toFixed(2)}</span>
          </span>
          <span className="text-zinc-600">
            VAT ({DEFAULT_VAT_PERCENT}%):{" "}
            <span className="font-medium text-zinc-900">{vatAmount.toFixed(2)}</span>
          </span>
          <span className="text-zinc-800">
            Grand total:{" "}
            <span className="font-semibold text-zinc-900">{grandTotal.toFixed(2)}</span>
          </span>
          {!allRowsValid ? (
            <span className="text-xs text-amber-700">
              Complete every line (description, qty, unit price) to see accurate totals —
              incomplete rows are excluded above.
            </span>
          ) : null}
        </div>
      </div>

      {state.message && !state.ok ? (
        <p className="text-sm text-red-700" role="status">
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary min-h-11">
        {isPending ? "Generating…" : `Generate ${DOCUMENT_TYPE_LABEL[type]}`}
      </button>
    </form>
  );
}

/** "New document" form: Quotation / Tax Invoice / Delivery Note without an LPO. */
export function NewDocumentForm({
  siteCodeSuggestions,
}: Readonly<{ siteCodeSuggestions: string[] }>) {
  // Remounting the form (new key) is the reset: it clears the action state,
  // the typed fields and the line items in one go.
  const [formKey, setFormKey] = useState(0);
  return (
    <DocumentForm
      key={formKey}
      siteCodeSuggestions={siteCodeSuggestions}
      onAnother={() => setFormKey((key) => key + 1)}
    />
  );
}
