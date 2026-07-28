"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createLpoAction,
  type CreateLpoActionState,
} from "@/modules/lpo/application/create-lpo-action";
import {
  DEFAULT_DELIVERY_DUE_DAYS,
  DEFAULT_REVIEW_DUE_DAYS,
} from "@/modules/lpo/domain/due-dates";

const initialState: CreateLpoActionState = {
  ok: false,
  message: null,
};

function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CreateLpoForm() {
  const [state, formAction, isPending] = useActionState(
    createLpoAction,
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
          <span className="mb-1 block font-medium text-zinc-800">LPO number</span>
          <input
            name="lpoNumber"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. LPO-2026-001"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Received date</span>
          <input
            type="date"
            name="receivedDate"
            required
            defaultValue={todayInputValue()}
            max={todayInputValue()}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">LPO file</span>
          <input
            type="file"
            name="file"
            required
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Stored locally for now (cloud upload in the next step).
          </span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Due days for review
          </span>
          <input
            type="number"
            name="reviewDueDays"
            min={1}
            defaultValue={DEFAULT_REVIEW_DUE_DAYS}
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Due days for delivery
          </span>
          <input
            type="number"
            name="deliveryDueDays"
            min={1}
            defaultValue={DEFAULT_DELIVERY_DUE_DAYS}
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
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
        {isPending ? "Creating…" : "Create LPO"}
      </button>
    </form>
  );
}
