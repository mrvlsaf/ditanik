"use client";

import { useActionState, useTransition } from "react";

import {
  createConsumptionRateAction,
  deactivateConsumptionRateAction,
  type ConsumptionActionState,
} from "@/modules/fabric/application/consumption-actions";

const initialState: ConsumptionActionState = { ok: false, message: null };

export function ConsumptionRatesPanel({
  rates,
}: Readonly<{
  rates: Array<{ id: string; garmentName: string; metersPerUnit: number }>;
}>) {
  const [state, formAction, isPending] = useActionState(
    createConsumptionRateAction,
    initialState,
  );
  const [isDeactivating, startDeactivate] = useTransition();

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="grid gap-3 surface-card p-4 sm:grid-cols-3 sm:items-end sm:p-6"
      >
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-zinc-800">Garment</span>
          <input
            name="garmentName"
            required
            placeholder="e.g. Chef Jacket"
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Meters / unit
          </span>
          <input
            type="number"
            name="metersPerUnit"
            min="0.001"
            step="0.001"
            required
            placeholder="1.8"
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary min-h-11"
        >
          {isPending ? "Saving…" : "Add rate"}
        </button>
        {state.message ? (
          <p
            className={`text-sm sm:col-span-3 ${state.ok ? "text-emerald-700" : "text-red-700"}`}
            role="status"
          >
            {state.message}
          </p>
        ) : null}
      </form>

      {rates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          No consumption rates yet. Add Chef Jacket, Pant, Shirt, etc.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden surface-card">
          {rates.map((rate) => (
            <li
              key={rate.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-zinc-900">{rate.garmentName}</p>
                <p className="text-sm text-zinc-600">
                  {rate.metersPerUnit} m per unit
                </p>
              </div>
              <button
                type="button"
                disabled={isDeactivating}
                onClick={() => {
                  startDeactivate(async () => {
                    await deactivateConsumptionRateAction(rate.id);
                  });
                }}
                className="btn-danger-outline text-xs"
              >
                Deactivate
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
