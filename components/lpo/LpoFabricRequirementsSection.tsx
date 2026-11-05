"use client";

import { useActionState, useTransition } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

import {
  addLpoFabricRequirementAction,
  deleteLpoFabricRequirementAction,
  type LpoFabricActionState,
} from "@/modules/fabric/application/lpo-fabric-actions";

const initialState: LpoFabricActionState = { ok: false, message: null };

export function LpoFabricRequirementsSection({
  lpoId,
  rates,
  requirements,
}: Readonly<{
  lpoId: string;
  rates: Array<{ id: string; garmentName: string; metersPerUnit: number }>;
  requirements: Array<{
    id: string;
    garmentName: string;
    quantity: number;
    metersPerUnit: number;
    expectedMeters: number;
  }>;
}>) {
  const bound = addLpoFabricRequirementAction.bind(null, lpoId);
  const [state, formAction, isPending] = useActionState(bound, initialState);
  const [isDeleting, startDelete] = useTransition();
  useGlobalPending(isPending || isDeleting);

  const totalExpected = requirements.reduce((sum, row) => sum + row.expectedMeters, 0);

  return (
    <section className="space-y-4 surface-card p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
          Expected fabric requirement
        </h2>
        <p className="text-sm text-zinc-600">
          Total: <span className="font-medium text-zinc-900">{totalExpected} m</span>
        </p>
      </div>

      {requirements.length > 0 ? (
        <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-100">
          {requirements.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-zinc-800">
                {row.quantity} × {row.garmentName} @ {row.metersPerUnit}m ={" "}
                <span className="font-medium">{row.expectedMeters}m</span>
              </p>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  startDelete(async () => {
                    await deleteLpoFabricRequirementAction(row.id, lpoId);
                  });
                }}
                className="btn-danger-outline text-xs"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500">No fabric lines yet.</p>
      )}

      <form
        action={formAction}
        className="grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-3"
      >
        <input type="hidden" name="lpoId" value={lpoId} />
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">
            Garment (from consumption table)
          </span>
          <select
            name="consumptionRateId"
            required
            defaultValue=""
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          >
            <option value="" disabled>
              Select…
            </option>
            {rates.map((r) => (
              <option key={r.id} value={r.id}>
                {r.garmentName} ({r.metersPerUnit}m)
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Quantity</span>
          <input
            type="number"
            name="quantity"
            min={1}
            step={1}
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        {state.message ? (
          <p
            className={`text-sm sm:col-span-3 ${state.ok ? "text-emerald-700" : "text-red-700"}`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending || rates.length === 0}
          className="btn-primary min-h-11 sm:col-span-3 sm:w-fit"
        >
          {isPending ? "Adding…" : "Add requirement"}
        </button>
      </form>
    </section>
  );
}
