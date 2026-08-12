"use client";

import { FabricVarianceReason } from "@prisma/client";
import { useActionState } from "react";

import {
  createVarianceAction,
  type VarianceActionState,
} from "@/modules/fabric/application/variance-actions";

const initialState: VarianceActionState = { ok: false, message: null };

const REASON_LABELS: Record<FabricVarianceReason, string> = {
  CUTTING_WASTAGE: "Cutting wastage",
  DAMAGE: "Damage",
  SIZE_ALTERATION: "Size alteration",
  PRODUCTION_MISTAKE: "Production mistake",
  OTHER: "Other",
};

export function VarianceForm({
  manufacturerId,
  batches,
  lpos,
}: Readonly<{
  manufacturerId: string;
  batches: Array<{ id: string; fabricCode: string; label: string }>;
  lpos: Array<{ id: string; lpoNumber: string; nickname: string }>;
}>) {
  const [state, formAction, isPending] = useActionState(
    createVarianceAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3 surface-card p-4 sm:p-6"
    >
      <input type="hidden" name="manufacturerId" value={manufacturerId} />
      <h3 className="text-sm font-medium text-zinc-800">Record variance</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Expected (m)</span>
          <input
            type="number"
            name="expectedMeters"
            step="0.001"
            required
            className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Actual / reported (m)</span>
          <input
            type="number"
            name="actualMeters"
            step="0.001"
            required
            className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Reason</span>
          <select
            name="reason"
            required
            defaultValue={FabricVarianceReason.OTHER}
            className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            {Object.entries(REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-700">Batch (optional)</span>
          <select
            name="batchId"
            defaultValue=""
            className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="">None</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-zinc-700">LPO (optional)</span>
          <select
            name="lpoId"
            defaultValue=""
            className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="">None</option>
            {lpos.map((l) => (
              <option key={l.id} value={l.id}>
                {l.lpoNumber} · {l.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block text-zinc-700">Note</span>
          <input
            name="note"
            className="min-h-10 w-full rounded-md border border-zinc-300 px-3 text-sm"
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
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? "Saving…" : "Save variance"}
      </button>
    </form>
  );
}
