"use client";

import { useActionState, useTransition } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, FormMessage, INPUT_CLASS } from "@/components/ui/Field";
import { formatMeters } from "@/modules/fabric/domain/fabric-glance";

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
  useGlobalPending(isPending || isDeactivating);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section
        className="surface-card min-w-0 flex-[2_1_480px] overflow-hidden"
        aria-labelledby="active-rates"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <h2 id="active-rates" className="text-[17px] font-bold">
            Active rates
          </h2>
          <span className="text-sm text-[var(--text-muted)]">{rates.length} in use</span>
        </div>
        {rates.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No consumption rates yet">
              Add a garment and its metres on the right, for example Chef Jacket, Pant or
              Shirt.
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Garment
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Metres per garment
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td className="px-4 py-3 font-semibold">{rate.garmentName}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMeters(rate.metersPerUnit)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={isDeactivating}
                        onClick={() => {
                          startDeactivate(async () => {
                            await deactivateConsumptionRateAction(rate.id);
                          });
                        }}
                        className="btn-secondary min-h-9"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-[var(--border)] px-5 py-3.5 text-sm text-[var(--text-muted)]">
          Deactivating a rate hides it from new LPOs. LPOs that already used it keep their
          numbers.
        </p>
      </section>

      <form
        action={formAction}
        aria-labelledby="add-rate"
        className="surface-card flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5"
      >
        <div>
          <h2 id="add-rate" className="text-[17px] font-bold">
            Add a rate
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            For example a chef jacket that needs 1.8 metres.
          </p>
        </div>
        <Field label="Garment">
          <input
            name="garmentName"
            required
            placeholder="e.g. Chef Jacket"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Metres per garment">
          <input
            type="number"
            name="metersPerUnit"
            min="0.001"
            step="0.001"
            required
            placeholder="1.8"
            className={INPUT_CLASS}
          />
        </Field>
        <FormMessage ok={state.ok} message={state.message} />
        <div>
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? "Saving…" : "Add rate"}
          </button>
        </div>
      </form>
    </div>
  );
}
