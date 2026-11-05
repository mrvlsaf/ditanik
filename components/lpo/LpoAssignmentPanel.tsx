"use client";

import { LpoStatus } from "@prisma/client";
import { useActionState, useRef, useState, useTransition } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { useDirectUploadOnSubmit } from "@/components/ui/useDirectUploadOnSubmit";

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
  usesBlobStorage,
}: Readonly<{
  lpoId: string;
  status: LpoStatus;
  manufacturerId: string | null;
  manufacturerName: string | null;
  productionFileKey: string | null;
  manufacturers: ManufacturerOption[];
  usesBlobStorage: boolean;
}>) {
  const gate = { status, productionFileKey, manufacturerId };
  const showAssign = canAssignManufacturer(gate);
  const showComplete = canMarkClientDeliveryCompleted(gate);

  const boundAssign = assignManufacturerAction.bind(null, lpoId);
  const [assignState, assignAction, assignPending] = useActionState(
    boundAssign,
    initialState,
  );
  const assignFormRef = useRef<HTMLFormElement>(null);
  const {
    onSubmit: onAssignSubmit,
    isUploadingFile,
    uploadError,
  } = useDirectUploadOnSubmit({
    formAction: assignAction,
    formRef: assignFormRef,
    fileFieldName: "productionFile",
    fileRefFieldName: "productionFileRef",
    folder: "lpo-production",
    usesBlobStorage,
  });
  const [mode, setMode] = useState<"existing" | "new">(
    manufacturers.length > 0 ? "existing" : "new",
  );
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [isCompleting, startComplete] = useTransition();
  useGlobalPending(assignPending || isCompleting || isUploadingFile);

  return (
    <section id="lpo-assign" className="scroll-mt-4 space-y-4 surface-card p-4 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
        Manufacturer assignment
      </h2>

      <p className="text-sm text-zinc-600">
        Status:{" "}
        <span className="font-medium text-zinc-900">{lpoStatusDetailLabel(status)}</span>
        {manufacturerName ? (
          <>
            {" "}
            · Manufacturer:{" "}
            <span className="font-medium text-zinc-900">{manufacturerName}</span>
          </>
        ) : null}
      </p>

      {showAssign ? (
        <form
          ref={assignFormRef}
          action={assignAction}
          onSubmit={onAssignSubmit}
          className="space-y-3"
        >
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
              <span className="mb-1 block font-medium text-zinc-800">Manufacturer</span>
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
              className="file-btn"
            />
          </label>

          {uploadError ? (
            <p className="text-sm text-red-700" role="status">
              {uploadError}
            </p>
          ) : null}

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
            disabled={assignPending || isUploadingFile}
            className="btn-primary"
          >
            {isUploadingFile
              ? "Uploading…"
              : assignPending
                ? "Assigning…"
                : "Assign manufacturer"}
          </button>
        </form>
      ) : null}

      {showComplete ? (
        <div id="lpo-complete" className="scroll-mt-4 border-t border-zinc-100 pt-4">
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
            className="btn-secondary"
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
