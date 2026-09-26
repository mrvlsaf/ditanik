"use client";

import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

import {
  issueFabricAction,
  type IssueFabricActionState,
} from "@/modules/fabric/application/issue-fabric-action";

const initialState: IssueFabricActionState = { ok: false, message: null };

function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function IssueFabricForm({
  batches,
  manufacturers,
  lpos,
}: Readonly<{
  batches: Array<{
    id: string;
    fabricCode: string;
    fabricType: string;
    colour: string;
    stockMeters: number;
  }>;
  manufacturers: Array<{ id: string; name: string }>;
  lpos: Array<{ id: string; lpoNumber: string; nickname: string }>;
}>) {
  const [state, formAction, isPending] = useActionState(issueFabricAction, initialState);
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
              Select batch…
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id} disabled={b.stockMeters <= 0}>
                {b.fabricCode} · {b.fabricType} / {b.colour} ({b.stockMeters}m avail)
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Manufacturer</span>
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
          <span className="mb-1 block font-medium text-zinc-800">Quantity (meters)</span>
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
          <span className="mb-1 block font-medium text-zinc-800">Date sent</span>
          <input
            type="date"
            name="occurredAt"
            required
            defaultValue={today}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Transport / reference
          </span>
          <input
            name="transportRef"
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
            <option value="">None — additional fabric (not tied to an LPO)</option>
            {lpos.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lpoNumber} · {l.nickname}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-zinc-500">
            Leave empty to keep this issue as standalone fabric on the manufacturer
            ledger. Choose an LPO to attribute meters to that job.
          </span>
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

      <button
        type="submit"
        disabled={isPending || batches.length === 0 || manufacturers.length === 0}
        className="btn-primary min-h-11"
      >
        {isPending ? "Issuing…" : "Issue to manufacturer"}
      </button>
    </form>
  );
}
