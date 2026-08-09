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
        className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-3 sm:items-end sm:p-6"
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
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
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
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white">
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
                className="text-sm text-red-700 hover:underline disabled:opacity-60"
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
