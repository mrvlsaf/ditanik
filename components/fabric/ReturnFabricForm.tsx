"use client";

import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

import {
  returnFabricAction,
  type ReturnFabricActionState,
} from "@/modules/fabric/application/return-fabric-action";

const initialState: ReturnFabricActionState = { ok: false, message: null };

function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ReturnFabricForm({
  batches,
  manufacturers,
  lpos,
}: Readonly<{
  batches: Array<{
    id: string;
    fabricCode: string;
    fabricType: string;
    colour: string;
  }>;
  manufacturers: Array<{ id: string; name: string }>;
  lpos: Array<{ id: string; lpoNumber: string; nickname: string }>;
}>) {
  const [state, formAction, isPending] = useActionState(returnFabricAction, initialState);
  useGlobalPending(isPending);
  const today = todayInputValue();

  return (
    <form action={formAction} className="space-y-4 surface-card p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">Batch</span>
          <select
            name="batchId"
            required
            defaultValue=""
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.fabricCode} · {b.fabricType} / {b.colour}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">From manufacturer</span>
          <select
            name="manufacturerId"
            required
            defaultValue=""
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Quantity returned (m)
          </span>
          <input
            type="number"
            name="quantityMeters"
            min="0.001"
            step="0.001"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Date</span>
          <input
            type="date"
            name="occurredAt"
            required
            defaultValue={today}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">
            Related LPO (optional)
          </span>
          <select
            name="lpoId"
            defaultValue=""
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="">None — return from additional (no LPO) fabric</option>
            {lpos.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lpoNumber} · {l.nickname}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-zinc-500">
            Pick the same LPO used when the fabric was issued, so that LPO’s balance
            updates correctly.
          </span>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">Note</span>
          <input
            name="note"
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
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
        {isPending ? "Saving…" : "Record return"}
      </button>
    </form>
  );
}
