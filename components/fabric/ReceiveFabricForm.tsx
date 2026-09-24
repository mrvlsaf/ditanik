"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

import {
  receiveFabricAction,
  type ReceiveFabricActionState,
} from "@/modules/fabric/application/receive-fabric-action";

const initialState: ReceiveFabricActionState = { ok: false, message: null };

type BatchRow = {
  fabricType: string;
  colour: string;
  remarks: string;
  qtyReceived: string;
};

function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ReceiveFabricForm() {
  const [batches, setBatches] = useState<BatchRow[]>([
    { fabricType: "", colour: "", remarks: "", qtyReceived: "" },
  ]);
  const [state, formAction, isPending] = useActionState(
    async (
      previous: ReceiveFabricActionState,
      formData: FormData,
    ): Promise<ReceiveFabricActionState> => {
      const result = await receiveFabricAction(previous, formData);
      if (result.ok) {
        setBatches([{ fabricType: "", colour: "", remarks: "", qtyReceived: "" }]);
      }
      return result;
    },
    initialState,
  );
  useGlobalPending(isPending);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const today = todayInputValue();

  return (
    <form ref={formRef} action={formAction} className="space-y-4 surface-card p-4 sm:p-6">
      <input
        type="hidden"
        name="batchesJson"
        value={JSON.stringify(
          batches.map((b) => ({
            fabricType: b.fabricType,
            colour: b.colour,
            remarks: b.remarks || undefined,
            qtyReceived: Number(b.qtyReceived),
          })),
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Supplier</span>
          <input
            name="supplierName"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Invoice / reference
          </span>
          <input
            name="invoiceRef"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Date received</span>
          <input
            type="date"
            name="receivedDate"
            required
            defaultValue={today}
            max={today}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Invoice PDF (required)
          </span>
          <input
            type="file"
            name="invoiceFile"
            accept="application/pdf,.pdf"
            required
            className="file-btn"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-zinc-800">
            Fabric lines (same invoice)
          </h3>
          <button
            type="button"
            onClick={() =>
              setBatches((rows) => [
                ...rows,
                { fabricType: "", colour: "", remarks: "", qtyReceived: "" },
              ])
            }
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
          >
            + Add line
          </button>
        </div>
        {batches.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Type</span>
              <input
                required
                value={row.fabricType}
                onChange={(e) => {
                  const value = e.target.value;
                  setBatches((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, fabricType: value } : r)),
                  );
                }}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Colour</span>
              <input
                required
                value={row.colour}
                onChange={(e) => {
                  const value = e.target.value;
                  setBatches((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, colour: value } : r)),
                  );
                }}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Qty (meters)</span>
              <input
                type="number"
                min="0.001"
                step="0.001"
                required
                value={row.qtyReceived}
                onChange={(e) => {
                  const value = e.target.value;
                  setBatches((rows) =>
                    rows.map((r, i) => (i === index ? { ...r, qtyReceived: value } : r)),
                  );
                }}
                className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-700">Remarks</span>
              <div className="flex gap-2">
                <input
                  value={row.remarks}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBatches((rows) =>
                      rows.map((r, i) => (i === index ? { ...r, remarks: value } : r)),
                    );
                  }}
                  className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
                />
                {batches.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setBatches((rows) => rows.filter((_, i) => i !== index))
                    }
                    className="btn-danger-outline shrink-0 text-xs"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </label>
          </div>
        ))}
      </div>

      {state.message ? (
        <p
          className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary min-h-11">
        {isPending ? "Saving…" : "Receive fabric"}
      </button>
    </form>
  );
}
