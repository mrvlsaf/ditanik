"use client";

import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import {
  Field,
  FORM_CARD_CLASS,
  FormHeader,
  FormMessage,
  INPUT_CLASS,
} from "@/components/ui/Field";

import {
  returnFabricAction,
  type ReturnFabricActionState,
} from "@/modules/fabric/application/return-fabric-action";
import { todayInputValue } from "@/lib/dates/today-input";

const initialState: ReturnFabricActionState = { ok: false, message: null };

export function ReturnFabricForm({
  batches,
  manufacturers,
  lpos,
  defaultBatchId,
}: Readonly<{
  batches: Array<{
    id: string;
    fabricCode: string;
    fabricType: string;
    colour: string;
  }>;
  manufacturers: Array<{ id: string; name: string }>;
  lpos: Array<{ id: string; lpoNumber: string; nickname: string }>;
  /** Batch to pre-select, when the page was opened from a batch's menu. */
  defaultBatchId?: string;
}>) {
  const [state, formAction, isPending] = useActionState(returnFabricAction, initialState);
  useGlobalPending(isPending);
  const today = todayInputValue();
  const startBatch = batches.some((b) => b.id === defaultBatchId)
    ? (defaultBatchId ?? "")
    : "";

  return (
    <form action={formAction} className={FORM_CARD_CLASS}>
      <FormHeader
        title="Record a return from a manufacturer"
        help="Use this when a manufacturer gives unused metres back. They go back into your stock and a return movement is recorded."
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
        <Field label="Batch" className="col-span-full">
          <select
            name="batchId"
            required
            defaultValue={startBatch}
            className={INPUT_CLASS}
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
        </Field>
        <Field label="From manufacturer">
          <select name="manufacturerId" required defaultValue="" className={INPUT_CLASS}>
            <option value="" disabled>
              Select…
            </option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Quantity returned (metres)">
          <input
            type="number"
            name="quantityMeters"
            min="0.001"
            step="0.001"
            required
            placeholder="e.g. 12"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            name="occurredAt"
            required
            defaultValue={today}
            className={INPUT_CLASS}
          />
        </Field>
        <Field
          label="LPO"
          optional
          tip="Pick the same LPO used when the fabric was issued, so that LPO's balance updates correctly."
        >
          <select name="lpoId" defaultValue="" className={INPUT_CLASS}>
            <option value="">None: return from additional fabric</option>
            {lpos.map((l) => (
              <option key={l.id} value={l.id}>
                LPO {l.lpoNumber} · {l.nickname}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note" optional className="col-span-full">
          <input name="note" className={INPUT_CLASS} />
        </Field>
      </div>

      <FormMessage ok={state.ok} message={state.message} />

      <div>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Saving…" : "Record return"}
        </button>
      </div>
    </form>
  );
}
