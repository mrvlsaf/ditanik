"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createLpoAction,
  type CreateLpoActionState,
} from "@/modules/lpo/application/create-lpo-action";

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

  const today = todayInputValue();

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 surface-card p-4 sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">LPO number</span>
          <input
            name="lpoNumber"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. 45892"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Nickname</span>
          <input
            name="nickname"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. ABC Hotel Uniform"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Client name</span>
          <input
            name="clientName"
            required
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            placeholder="e.g. ABC Hotel"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            LPO received date
          </span>
          <input
            type="date"
            name="receivedDate"
            required
            defaultValue={today}
            max={today}
            className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
          />
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1 block font-medium text-zinc-800">
            LPO document (PDF)
          </span>
          <input
            type="file"
            name="file"
            accept="application/pdf,.pdf"
            required
            className="file-btn"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            PDF only (max 25MB). Assignment +2 / production +12 / client delivery
            +15 days are calculated from the received date.
          </span>
        </label>
      </div>

      {state.message ? (
        <p
          className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary min-h-11"
      >
        {isPending ? "Creating…" : "Create LPO"}
      </button>
    </form>
  );
}
