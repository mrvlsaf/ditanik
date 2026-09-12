"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createLpoAction,
  type CreateLpoActionState,
} from "@/modules/lpo/application/create-lpo-action";
import {
  extractLpoFromPdfAction,
  type ExtractLpoFromPdfActionState,
} from "@/modules/lpo/application/extract-lpo-from-pdf-action";
import {
  DEFAULT_VAT_PERCENT,
  calculateGrandTotal,
  calculateLineItemsSubtotal,
  calculateLineTotal,
  calculateVatAmount,
  roundCurrency,
} from "@/modules/lpo/domain/line-items";

const initialState: CreateLpoActionState = {
  ok: false,
  message: null,
};

const initialExtractState: ExtractLpoFromPdfActionState = {
  ok: false,
  message: null,
  data: null,
};

type LineItemRow = {
  category: string;
  description: string;
  articleNo: string;
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

const emptyLineItem: LineItemRow = {
  category: "",
  description: "",
  articleNo: "",
  quantity: "",
  unitPrice: "",
  discountPercent: "",
};

type FieldValues = {
  lpoNumber: string;
  nickname: string;
  clientName: string;
  receivedDate: string;
  clientSubEntityName: string;
  clientTrn: string;
  invoiceAddress: string;
  deliveryAddress: string;
  siteCode: string;
  paymentTerms: string;
  deliveryTerms: string;
  currency: string;
};

function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

export function CreateLpoForm() {
  const today = todayInputValue();
  const emptyFields: FieldValues = {
    lpoNumber: "",
    nickname: "",
    clientName: "",
    receivedDate: today,
    clientSubEntityName: "",
    clientTrn: "",
    invoiceAddress: "",
    deliveryAddress: "",
    siteCode: "",
    paymentTerms: "",
    deliveryTerms: "",
    currency: "AED",
  };

  const [fields, setFields] = useState<FieldValues>(emptyFields);
  const [lineItems, setLineItems] = useState<LineItemRow[]>([{ ...emptyLineItem }]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    async (
      previous: CreateLpoActionState,
      formData: FormData,
    ): Promise<CreateLpoActionState> => {
      const result = await createLpoAction(previous, formData);
      if (result.ok) {
        setFields(emptyFields);
        setLineItems([{ ...emptyLineItem }]);
      }
      return result;
    },
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const [extractState, setExtractState] = useState(initialExtractState);
  const [isExtracting, setIsExtracting] = useState(false);

  function updateField(patch: Partial<FieldValues>) {
    setFields((prev) => ({ ...prev, ...patch }));
  }

  async function handlePrefillFromPdf() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setExtractState({ ok: false, message: "Choose the LPO PDF below first.", data: null });
      return;
    }

    setIsExtracting(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await extractLpoFromPdfAction(initialExtractState, formData);
    setIsExtracting(false);
    setExtractState(result);

    if (result.ok && result.data) {
      const extracted = result.data;
      setFields((prev) => ({
        ...prev,
        lpoNumber: extracted.orderNumber ?? prev.lpoNumber,
        clientName: extracted.clientName ?? prev.clientName,
        clientSubEntityName: extracted.clientSubEntityName ?? prev.clientSubEntityName,
        clientTrn: extracted.clientTrn ?? prev.clientTrn,
        invoiceAddress: extracted.invoiceAddress ?? prev.invoiceAddress,
        deliveryAddress: extracted.deliveryAddress ?? prev.deliveryAddress,
        currency: extracted.currency ?? prev.currency,
        paymentTerms: extracted.paymentTerms ?? prev.paymentTerms,
        deliveryTerms: extracted.deliveryTerms ?? prev.deliveryTerms,
        receivedDate:
          extracted.orderDate && extracted.orderDate <= today
            ? extracted.orderDate
            : prev.receivedDate,
      }));

      if (extracted.lineItems.length > 0) {
        setLineItems(
          extracted.lineItems.map((item) => ({
            category: "",
            description: item.description,
            articleNo: item.articleNo ?? "",
            quantity: item.quantity != null ? String(item.quantity) : "",
            unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
            discountPercent:
              item.discountPercent != null && item.discountPercent > 0
                ? String(item.discountPercent)
                : "",
          })),
        );
      }
    }
  }

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
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6 surface-card p-4 sm:p-6"
    >
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
            discountPercent: row.discountPercent ? Number(row.discountPercent) : undefined,
          })),
        )}
      />

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">LPO details</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">LPO number</span>
            <input
              name="lpoNumber"
              required
              value={fields.lpoNumber}
              onChange={(e) => updateField({ lpoNumber: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="e.g. 45892"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Nickname</span>
            <input
              name="nickname"
              required
              value={fields.nickname}
              onChange={(e) => updateField({ nickname: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="e.g. ABC Hotel Uniform"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Client name</span>
            <input
              name="clientName"
              required
              value={fields.clientName}
              onChange={(e) => updateField({ clientName: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="e.g. ABC Hotel"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              LPO received date
            </span>
            <input
              type="date"
              name="receivedDate"
              required
              value={fields.receivedDate}
              onChange={(e) => updateField({ receivedDate: e.target.value })}
              max={today}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>

          <div className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-800">
              LPO document (PDF)
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept="application/pdf,.pdf"
                required
                className="file-btn"
              />
              <button
                type="button"
                onClick={handlePrefillFromPdf}
                disabled={isExtracting}
                className="btn-secondary shrink-0 text-sm"
              >
                {isExtracting ? "Reading PDF…" : "Prefill from this PDF"}
              </button>
            </div>
            <span className="mt-1 block text-xs text-zinc-500">
              PDF only (max 25MB). Assignment +2 / production +12 / client delivery
              +15 days are calculated from the received date.
            </span>
            {extractState.message ? (
              <p
                className={`mt-2 text-xs ${extractState.ok ? "text-emerald-700" : "text-amber-700"}`}
                role="status"
              >
                {extractState.message}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-zinc-800">
          Client &amp; commercial details
        </h3>
        <p className="text-xs text-zinc-500">
          Feeds the Quotation, Quote, Invoice and Delivery Note generated for this
          LPO — Deezano&apos;s own letterhead comes from the Company profile
          settings.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Site code
            </span>
            <input
              name="siteCode"
              required
              value={fields.siteCode}
              onChange={(e) => updateField({ siteCode: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="e.g. AHO"
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Short code identifying the delivery site — used in document numbers
              (e.g. AHO-INV-23072026-09). Not extracted from the PDF — the source
              LPO doesn&apos;t carry it.
            </span>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Client sub-entity / department
            </span>
            <input
              name="clientSubEntityName"
              value={fields.clientSubEntityName}
              onChange={(e) => updateField({ clientSubEntityName: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Client TRN</span>
            <input
              name="clientTrn"
              value={fields.clientTrn}
              onChange={(e) => updateField({ clientTrn: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Currency</span>
            <input
              name="currency"
              value={fields.currency}
              onChange={(e) => updateField({ currency: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-800">
              Invoice address
            </span>
            <textarea
              name="invoiceAddress"
              required
              rows={3}
              value={fields.invoiceAddress}
              onChange={(e) => updateField({ invoiceAddress: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Client billing address, from the LPO"
            />
          </label>

          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-800">
              Delivery address
            </span>
            <textarea
              name="deliveryAddress"
              rows={3}
              value={fields.deliveryAddress}
              onChange={(e) => updateField({ deliveryAddress: e.target.value })}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Optional — leave blank to reuse the invoice address"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Payment terms
            </span>
            <input
              name="paymentTerms"
              value={fields.paymentTerms}
              onChange={(e) => updateField({ paymentTerms: e.target.value })}
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Delivery terms
            </span>
            <input
              name="deliveryTerms"
              value={fields.deliveryTerms}
              onChange={(e) => updateField({ deliveryTerms: e.target.value })}
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
            onClick={() => setLineItems((rows) => [...rows, { ...emptyLineItem }])}
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
              Line total:{" "}
              {rowTotals[index] != null
                ? rowTotals[index]!.toFixed(2)
                : "—"}
            </div>
          </div>
        ))}

        <div className="flex flex-col items-end gap-1 border-t border-zinc-100 pt-3 text-sm">
          <span className="text-zinc-600">
            Subtotal: <span className="font-medium text-zinc-900">{subtotal.toFixed(2)}</span>
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
              Complete every line (description, qty, unit price) to see accurate
              totals — invalid rows are excluded above.
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

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary min-h-11"
      >
        {isPending ? "Creating…" : "Create LPO"}
      </button>
    </form>
  );
}
