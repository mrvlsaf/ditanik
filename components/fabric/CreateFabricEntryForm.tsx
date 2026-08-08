"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createFabricEntryAction,
  type CreateFabricEntryActionState,
} from "@/modules/fabric/application/create-fabric-entry-action";

const initialState: CreateFabricEntryActionState = {
  ok: false,
  message: null,
};

export function CreateFabricEntryForm() {
  const [state, formAction, isPending] = useActionState(
    createFabricEntryAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Vendor</span>
          <input
            name="vendor"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. Acme Textiles"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Color</span>
          <input
            name="color"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. Navy"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Meters received
          </span>
          <input
            type="number"
            name="metersReceived"
            required
            min={0.01}
            step="0.01"
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Meters delivered
          </span>
          <input
            type="number"
            name="metersDelivered"
            required
            min={0}
            step="0.01"
            defaultValue={0}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">Destination</span>
          <input
            name="destination"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. Warehouse A"
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">
            Invoice PDF
          </span>
          <input
            type="file"
            name="invoiceFile"
            accept="application/pdf,.pdf"
            required
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
        </label>
      </div>

      {state.message ? (
        <output
          className={`block text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
        >
          {state.message}
        </output>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Create fabric entry"}
      </button>
    </form>
  );
}
