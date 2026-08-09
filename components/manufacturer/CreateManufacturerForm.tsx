"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createManufacturerAction,
  type CreateManufacturerActionState,
} from "@/modules/manufacturer/application/create-manufacturer-action";

const initialState: CreateManufacturerActionState = {
  ok: false,
  message: null,
};

export function CreateManufacturerForm() {
  const [state, formAction, isPending] = useActionState(
    createManufacturerAction,
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
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-end sm:p-6"
    >
      <label className="block flex-1 text-sm">
        <span className="mb-1 block font-medium text-zinc-800">Name</span>
        <input
          name="name"
          required
          className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          placeholder="e.g. XYZ Garments"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add manufacturer"}
      </button>
      {state.message ? (
        <p
          className={`text-sm sm:basis-full ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
