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
import { formatMeters } from "@/modules/fabric/domain/fabric-glance";

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
  defaultBatchId,
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
  /** Batch to pre-select, when the page was opened from a batch's Issue button. */
  defaultBatchId?: string;
}>) {
  const [state, formAction, isPending] = useActionState(issueFabricAction, initialState);
  useGlobalPending(isPending);
  const today = todayInputValue();
  const startBatch = batches.some((b) => b.id === defaultBatchId && b.stockMeters > 0)
    ? (defaultBatchId ?? "")
    : "";

  return (
    <form action={formAction} className={FORM_CARD_CLASS}>
      <FormHeader
        title="Issue fabric to a manufacturer"
        help="Sends metres from a batch to a manufacturer. Your stock goes down and a movement is recorded. You cannot issue more than is available."
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <Field label="Batch" className="col-span-full">
          <select
            name="batchId"
            required
            defaultValue={startBatch}
            className={INPUT_CLASS}
          >
            <option value="" disabled>
              Select batch…
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id} disabled={b.stockMeters <= 0}>
                {b.fabricCode} · {b.fabricType} / {b.colour} (
                {formatMeters(b.stockMeters)} available)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Manufacturer">
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
        <Field label="Quantity (metres)">
          <input
            type="number"
            name="quantityMeters"
            min="0.001"
            step="0.001"
            required
            placeholder="e.g. 40"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Date sent">
          <input
            type="date"
            name="occurredAt"
            required
            defaultValue={today}
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Transport reference" optional>
          <input name="transportRef" className={INPUT_CLASS} />
        </Field>
        <Field
          label="LPO"
          className="col-span-full"
          tip="Link the fabric to an LPO so the manufacturer ledger can compare it with what that order needs. Leave it empty for additional fabric."
        >
          <select name="lpoId" defaultValue="" className={INPUT_CLASS}>
            <option value="">None: additional fabric (not tied to an LPO)</option>
            {lpos.map((l) => (
              <option key={l.id} value={l.id}>
                LPO {l.lpoNumber} · {l.nickname}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <FormMessage ok={state.ok} message={state.message} />

      <div>
        <button
          type="submit"
          disabled={isPending || batches.length === 0 || manufacturers.length === 0}
          className="btn-primary"
        >
          {isPending ? "Issuing…" : "Issue to manufacturer"}
        </button>
      </div>
    </form>
  );
}
