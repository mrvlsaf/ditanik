"use client";

import { useActionState, useEffect, useRef } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";

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
  useGlobalPending(isPending);
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
      className="flex flex-col gap-3 surface-card p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-6"
    >
      <label className="block min-w-0 flex-1 basis-full text-sm sm:basis-0 sm:min-w-[16rem]">
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
        className="btn-primary min-h-11 shrink-0"
      >
        {isPending ? "Saving…" : "Add manufacturer"}
      </button>
      {state.message ? (
        <p
          className={`w-full basis-full text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
