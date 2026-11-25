"use client";

import { FabricVarianceReason } from "@prisma/client";
import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { Field, FormHeader, FormMessage, INPUT_CLASS } from "@/components/ui/Field";

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
  useGlobalPending(isPending);

  return (
    <form
      action={formAction}
      className="surface-card flex min-w-0 flex-[1_1_380px] flex-col gap-4 p-5"
    >
      <input type="hidden" name="manufacturerId" value={manufacturerId} />
      <FormHeader
        title="Record a variance"
        help="Use this when the fabric actually used differs from what was expected, so the ledger stays honest."
      />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(150px,100%),1fr))]">
        <Field label="Expected (m)">
          <input
            type="number"
            name="expectedMeters"
            step="0.001"
            required
            placeholder="e.g. 34"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Actual (m)">
          <input
            type="number"
            name="actualMeters"
            step="0.001"
            required
            placeholder="e.g. 36.5"
            className={INPUT_CLASS}
          />
        </Field>
      </div>
      <Field label="Reason">
        <select
          name="reason"
          required
          defaultValue={FabricVarianceReason.OTHER}
          className={INPUT_CLASS}
        >
          {Object.entries(REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Batch" optional>
        <select name="batchId" defaultValue="" className={INPUT_CLASS}>
          <option value="">None</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="LPO" optional>
        <select name="lpoId" defaultValue="" className={INPUT_CLASS}>
          <option value="">None</option>
          {lpos.map((l) => (
            <option key={l.id} value={l.id}>
              LPO {l.lpoNumber} · {l.nickname}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note" optional>
        <input name="note" className={INPUT_CLASS} />
      </Field>
      <FormMessage ok={state.ok} message={state.message} />
      <div>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Saving…" : "Save variance"}
        </button>
      </div>
    </form>
  );
}
