"use client";

import { useActionState, useEffect, useRef } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { Field, FormMessage, INPUT_CLASS } from "@/components/ui/Field";

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
      aria-labelledby="add-manufacturer"
      className="surface-card flex flex-wrap items-end gap-4 p-5"
    >
      <div className="flex min-w-[260px] flex-[1_1_300px] flex-col gap-3">
        <h2 id="add-manufacturer" className="text-[17px] font-bold">
          Add a manufacturer
        </h2>
        <Field label="Name">
          <input
            name="name"
            required
            className={INPUT_CLASS}
            placeholder="e.g. XYZ Garments"
          />
        </Field>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary shrink-0">
        {isPending ? "Saving…" : "Add manufacturer"}
      </button>
      {state.message ? (
        <div className="w-full">
          <FormMessage ok={state.ok} message={state.message} />
        </div>
      ) : null}
    </form>
  );
}
