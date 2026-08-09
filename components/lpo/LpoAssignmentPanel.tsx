"use client";

import { LpoStatus } from "@prisma/client";
import { useActionState, useState, useTransition } from "react";

import {
  assignManufacturerAction,
  markClientDeliveryCompletedAction,
  type LpoMutationActionState,
} from "@/modules/lpo/application/lpo-actions";
import {
  canAssignManufacturer,
  canMarkClientDeliveryCompleted,
  lpoStatusDetailLabel,
} from "@/modules/lpo/domain/lpo-status";

const initialState: LpoMutationActionState = {
  ok: false,
  message: null,
};

type ManufacturerOption = {
  id: string;
  name: string;
};

export function LpoAssignmentPanel({
  lpoId,
  status,
  manufacturerId,
  manufacturerName,
  productionFileKey,
  manufacturers,
}: Readonly<{
  lpoId: string;
  status: LpoStatus;
  manufacturerId: string | null;
  manufacturerName: string | null;
  productionFileKey: string | null;
  manufacturers: ManufacturerOption[];
}>) {
  const gate = { status, productionFileKey, manufacturerId };
  const showAssign = canAssignManufacturer(gate);
  const showComplete = canMarkClientDeliveryCompleted(gate);

  const boundAssign = assignManufacturerAction.bind(null, lpoId);
  const [assignState, assignAction, assignPending] = useActionState(
    boundAssign,
    initialState,
  );
  const [mode, setMode] = useState<"existing" | "new">(
    manufacturers.length > 0 ? "existing" : "new",
  );
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [isCompleting, startComplete] = useTransition();

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
        Manufacturer assignment
      </h2>

      <p className="text-sm text-zinc-600">
        Status:{" "}
        <span className="font-medium text-zinc-900">
          {lpoStatusDetailLabel(status)}
        </span>
        {manufacturerName ? (
          <>
            {" "}
            · Manufacturer:{" "}
            <span className="font-medium text-zinc-900">{manufacturerName}</span>
          </>
        ) : null}
      </p>

      {showAssign ? (
        <form action={assignAction} className="space-y-3">
          <div className="flex flex-wrap gap-3 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="assignMode"
                checked={mode === "existing"}
                onChange={() => setMode("existing")}
                disabled={manufacturers.length === 0}
              />
              Existing manufacturer
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="assignMode"
                checked={mode === "new"}
                onChange={() => setMode("new")}
              />
              Register new manufacturer
            </label>
          </div>

          {mode === "existing" ? (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">
                Manufacturer
              </span>
              <select
                name="manufacturerId"
                required
                className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
                defaultValue=""
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
          ) : (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">
                New manufacturer name
              </span>
              <input
                name="newManufacturerName"
                required
                className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
                placeholder="e.g. XYZ Garments"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              Production file (PDF)
            </span>
            <input
              type="file"
              name="productionFile"
              accept="application/pdf,.pdf"
              required
              className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            />
          </label>

          {assignState.message ? (
            <p
              className={`text-sm ${assignState.ok ? "text-emerald-700" : "text-red-700"}`}
              role="status"
            >
              {assignState.message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={assignPending}
            className="inline-flex min-h-10 items-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {assignPending ? "Assigning…" : "Assign manufacturer"}
          </button>
        </form>
      ) : null}

      {showComplete ? (
        <div className="border-t border-zinc-100 pt-4">
          {completeMessage ? (
            <p className="mb-2 text-sm text-red-700" role="status">
              {completeMessage}
            </p>
          ) : null}
          <button
            type="button"
            disabled={isCompleting}
            onClick={() => {
              startComplete(async () => {
                const result = await markClientDeliveryCompletedAction(lpoId);
                if (!result.ok) {
                  setCompleteMessage(result.message);
                }
              });
            }}
            className="inline-flex min-h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {isCompleting ? "Saving…" : "Mark client delivery completed"}
          </button>
        </div>
      ) : null}

      {!showAssign && !showComplete && status === LpoStatus.CLIENT_DELIVERY_COMPLETED ? (
        <p className="text-sm text-emerald-700">Client delivery is complete.</p>
      ) : null}
    </section>
  );
}
