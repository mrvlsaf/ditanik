"use client";

import { useActionState, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { useRouter } from "next/navigation";

import {
  updateLpoAction,
  type UpdateLpoActionState,
} from "@/modules/lpo/application/update-lpo-action";
import {
  DEFAULT_VAT_PERCENT,
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateLineTotal,
  calculateVatAmount,
  roundCurrency,
} from "@/modules/lpo/domain/line-items";

const initialState: UpdateLpoActionState = { ok: false, message: null };

type LineItemRow = {
  category: string;
  description: string;
  articleNo: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

export type EditLpoFormDefaults = {
  lpoId: string;
  lpoNumber: string;
  nickname: string;
  clientName: string;
  clientSubEntityName: string;
  clientTrn: string;
  invoiceAddress: string;
  deliveryAddress: string;
  siteCode: string;
  paymentTerms: string;
  deliveryTerms: string;
  currency: string;
  lineItems: LineItemRow[];
};

/** Best-effort live total for one row; returns null while the row is incomplete/invalid. */
function tryLineTotal(row: LineItemRow): number | null {
  const quantity = Number(row.quantity);
  const unitPrice = Number(row.unitPrice);
  const discountPercent = row.discountPercent ? Number(row.discountPercent) : 0;

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 1) {
    return null;
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return null;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    return null;
  }

  try {
    return calculateLineTotal({ quantity, unitPrice, discountPercent });
  } catch {
    return null;
  }
}

/**
 * Edits an LPO's client & commercial details and line items after creation —
 * the LPO number, received date, and original PDF stay fixed (those have
 * their own dedicated flows / are the immutable record of what came in).
 * Documents already generated keep their own frozen snapshot, so saving
 * changes here never rewrites something already sent.
 */
export function EditLpoForm({ defaults }: Readonly<{ defaults: EditLpoFormDefaults }>) {
  const router = useRouter();
  const [lineItems, setLineItems] = useState<LineItemRow[]>(
    defaults.lineItems.length > 0
      ? defaults.lineItems
      : [
          {
            category: "",
            description: "",
            articleNo: "",
            quantity: "",
            unitPrice: "",
            discountPercent: "",
          },
        ],
  );
  const [state, formAction, isPending] = useActionState(
    async (
      previous: UpdateLpoActionState,
      formData: FormData,
    ): Promise<UpdateLpoActionState> => {
      const result = await updateLpoAction(previous, formData);
      if (result.ok) {
        router.push(`/lpo/${defaults.lpoId}`);
      }
      return result;
    },
    initialState,
  );
  useGlobalPending(isPending);

  const rowTotals = lineItems.map(tryLineTotal);
  const subtotal = calculateLineItemsSubtotal(
    rowTotals
      .filter((total): total is number => total != null)
      .map((total) => ({ lineTotal: total })),
  );
  const vatAmount = calculateVatAmount(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, vatAmount);
  const allRowsValid = rowTotals.every((total) => total != null);

  function updateRow(index: number, patch: Partial<LineItemRow>) {
    setLineItems((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <form action={formAction} className="space-y-6 surface-card p-4 sm:p-6">
      <input type="hidden" name="lpoId" value={defaults.lpoId} />
      <input
        type="hidden"
        name="lineItemsJson"
        value={JSON.stringify(
          lineItems.map((row) => ({
            category: row.category || undefined,
            description: row.description,
            articleNo: row.articleNo || undefined,
            quantity: Number(row.quantity),
            unitPrice: Number(row.unitPrice),
            discountPercent: row.discountPercent
              ? Number(row.discountPercent)
              : undefined,
          })),
        )}
      />

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">LPO details</h3>
        <p className="text-xs text-zinc-500">
          LPO number, received date, and the original PDF aren&apos;t editable here — the
          number is a fixed identifier and the received date drives the
          assignment/production/delivery due dates (use the dates section on the LPO page
          to extend those, with a reason).
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">LPO number</span>
            <p className="min-h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600">
              {defaults.lpoNumber}
            </p>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Nickname</span>
            <input
              name="nickname"
              required
              defaultValue={defaults.nickname}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Client name</span>
            <input
              name="clientName"
              required
              defaultValue={defaults.clientName}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">
          Client &amp; commercial details
        </h3>
        <p className="text-xs text-zinc-500">
          Feeds the Quotation, Quote, Invoice and Delivery Note generated for this LPO
          from now on — documents already generated keep the details that were true when
          they were made.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Site code</span>
            <input
              name="siteCode"
              required
              defaultValue={defaults.siteCode}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="e.g. AHO"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Client sub-entity / department
            </span>
            <input
              name="clientSubEntityName"
              defaultValue={defaults.clientSubEntityName}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Client TRN</span>
            <input
              name="clientTrn"
              defaultValue={defaults.clientTrn}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Currency</span>
            <input
              name="currency"
              defaultValue={defaults.currency}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-800">Invoice address</span>
            <textarea
              name="invoiceAddress"
              required
              rows={3}
              defaultValue={defaults.invoiceAddress}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-800">Delivery address</span>
            <textarea
              name="deliveryAddress"
              rows={3}
              defaultValue={defaults.deliveryAddress}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Optional — leave blank to reuse the invoice address"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Payment terms</span>
            <input
              name="paymentTerms"
              defaultValue={defaults.paymentTerms}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Delivery terms</span>
            <input
              name="deliveryTerms"
              defaultValue={defaults.deliveryTerms}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-800">Line items</h3>
          <button
            type="button"
            onClick={() =>
              setLineItems((rows) => [
                ...rows,
                {
                  category: "",
                  description: "",
                  articleNo: "",
                  quantity: "",
                  unitPrice: "",
                  discountPercent: "",
                },
              ])
            }
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            + Add line
          </button>
        </div>

        {lineItems.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-6"
          >
            <label className="block text-sm lg:col-span-2">
              <span className="mb-1 block text-zinc-700">Description</span>
              <input
                required
                value={row.description}
                onChange={(e) => updateRow(index, { description: e.target.value })}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Category</span>
              <input
                value={row.category}
                onChange={(e) => updateRow(index, { category: e.target.value })}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Article no.</span>
              <input
                value={row.articleNo}
                onChange={(e) => updateRow(index, { articleNo: e.target.value })}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Qty</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={row.quantity}
                onChange={(e) => updateRow(index, { quantity: e.target.value })}
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
                onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
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
                  onChange={(e) => updateRow(index, { discountPercent: e.target.value })}
                  className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                />
                {lineItems.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setLineItems((rows) => rows.filter((_, i) => i !== index))
                    }
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
            <span className="font-semibold text-zinc-900">
              {roundCurrency(grandTotal).toFixed(2)}
            </span>
          </span>
          {!allRowsValid ? (
            <span className="text-xs text-amber-700">
              Complete every line (description, qty, unit price) to see accurate totals —
              invalid rows are excluded above.
            </span>
          ) : null}
        </div>
      </div>

      {state.message ? (
        <p
          className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className="btn-primary min-h-11">
          {isPending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/lpo/${defaults.lpoId}`)}
          className="btn-secondary min-h-11"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
