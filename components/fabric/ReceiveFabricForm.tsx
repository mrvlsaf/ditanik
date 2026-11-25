"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import {
  CELL_INPUT_CLASS,
  Field,
  FORM_CARD_CLASS,
  FormHeader,
  FormMessage,
  INPUT_CLASS,
} from "@/components/ui/Field";
import { useDirectUploadOnSubmit } from "@/components/ui/useDirectUploadOnSubmit";

import {
  receiveFabricAction,
  type ReceiveFabricActionState,
} from "@/modules/fabric/application/receive-fabric-action";

const initialState: ReceiveFabricActionState = { ok: false, message: null };

type BatchRow = {
  fabricType: string;
  colour: string;
  remarks: string;
  qtyReceived: string;
};

function todayInputValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ReceiveFabricForm({
  usesBlobStorage,
}: Readonly<{ usesBlobStorage: boolean }>) {
  const [batches, setBatches] = useState<BatchRow[]>([
    { fabricType: "", colour: "", remarks: "", qtyReceived: "" },
  ]);
  const [state, formAction, isPending] = useActionState(
    async (
      previous: ReceiveFabricActionState,
      formData: FormData,
    ): Promise<ReceiveFabricActionState> => {
      const result = await receiveFabricAction(previous, formData);
      if (result.ok) {
        setBatches([{ fabricType: "", colour: "", remarks: "", qtyReceived: "" }]);
      }
      return result;
    },
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const {
    onSubmit: onDirectUploadSubmit,
    isUploadingFile,
    uploadError,
  } = useDirectUploadOnSubmit({
    formAction,
    formRef,
    fileFieldName: "invoiceFile",
    fileRefFieldName: "invoiceFileRef",
    folder: "fabric-invoices",
    usesBlobStorage,
  });
  useGlobalPending(isPending || isUploadingFile);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const today = todayInputValue();

  function updateRow(index: number, patch: Partial<BatchRow>) {
    setBatches((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={onDirectUploadSubmit}
      className={FORM_CARD_CLASS}
    >
      <input
        type="hidden"
        name="batchesJson"
        value={JSON.stringify(
          batches.map((b) => ({
            fabricType: b.fabricType,
            colour: b.colour,
            remarks: b.remarks || undefined,
            qtyReceived: Number(b.qtyReceived),
          })),
        )}
      />

      <FormHeader
        title="Receive fabric from a supplier"
        help={
          <>
            Record the supplier invoice and each fabric line on it. Every line is added to
            stock as its own batch. It is saved as a fabric invoice in{" "}
            <Link
              href="/invoices"
              className="font-medium text-[var(--brand)] hover:underline"
            >
              Invoices
            </Link>
            , where you can find it later.
          </>
        }
      />

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <Field label="Supplier">
          <input
            name="supplierName"
            required
            placeholder="Supplier name"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Invoice reference">
          <input
            name="invoiceRef"
            required
            placeholder="e.g. INV-2291"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Date received">
          <input
            type="date"
            name="receivedDate"
            required
            defaultValue={today}
            max={today}
            className={INPUT_CLASS}
          />
        </Field>
        <Field
          label="Invoice total incl. VAT (AED)"
          optional
          tip="Used for the VAT figures on the Invoices page. The VAT part is worked out at 5%. Leave it blank if you do not have it yet."
        >
          <input
            type="number"
            name="totalInclVat"
            min="0"
            step="0.01"
            placeholder="e.g. 8400"
            className={INPUT_CLASS}
          />
        </Field>
        <Field
          label="Invoice file (PDF)"
          optional
          tip="Optional, but recommended. If you add it, it is stored with the invoice so you can open it again later."
        >
          <input
            type="file"
            name="invoiceFile"
            accept="application/pdf,.pdf"
            className="file-btn"
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2.5">
        <p className="text-sm font-semibold text-[var(--foreground)]">Fabric lines</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
                <th scope="col" className="py-2 pr-3">
                  Type
                </th>
                <th scope="col" className="py-2 pr-3">
                  Colour
                </th>
                <th scope="col" className="py-2 pr-3">
                  Qty (metres)
                </th>
                <th scope="col" className="py-2 pr-3">
                  Remarks
                </th>
                <th scope="col" className="py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {batches.map((row, index) => (
                <tr key={index}>
                  <td className="py-1 pr-3">
                    <input
                      required
                      value={row.fabricType}
                      onChange={(e) => updateRow(index, { fabricType: e.target.value })}
                      aria-label={`Type, line ${index + 1}`}
                      className={`${CELL_INPUT_CLASS} min-w-36`}
                    />
                  </td>
                  <td className="py-1 pr-3">
                    <input
                      required
                      value={row.colour}
                      onChange={(e) => updateRow(index, { colour: e.target.value })}
                      aria-label={`Colour, line ${index + 1}`}
                      className={`${CELL_INPUT_CLASS} min-w-28`}
                    />
                  </td>
                  <td className="py-1 pr-3">
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                      value={row.qtyReceived}
                      onChange={(e) => updateRow(index, { qtyReceived: e.target.value })}
                      aria-label={`Metres, line ${index + 1}`}
                      className={`${CELL_INPUT_CLASS} w-28`}
                    />
                  </td>
                  <td className="py-1 pr-3">
                    <input
                      value={row.remarks}
                      onChange={(e) => updateRow(index, { remarks: e.target.value })}
                      aria-label={`Remarks, line ${index + 1}`}
                      className={`${CELL_INPUT_CLASS} min-w-40`}
                    />
                  </td>
                  <td className="py-1 text-right">
                    {batches.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setBatches((rows) => rows.filter((_, i) => i !== index))
                        }
                        className="btn-danger-outline text-xs"
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <button
            type="button"
            onClick={() =>
              setBatches((rows) => [
                ...rows,
                { fabricType: "", colour: "", remarks: "", qtyReceived: "" },
              ])
            }
            className="btn-secondary"
          >
            Add another line
          </button>
        </div>
      </div>

      {uploadError ? <FormMessage ok={false} message={uploadError} /> : null}
      <FormMessage ok={state.ok} message={state.message} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending || isUploadingFile}
          className="btn-primary"
        >
          {isUploadingFile ? "Uploading…" : isPending ? "Saving…" : "Receive fabric"}
        </button>
        <span className="text-sm text-[var(--text-muted)]">
          Next: issue it to a manufacturer from the Stock tab.
        </span>
      </div>
    </form>
  );
}
