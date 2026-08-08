"use client";

import { useActionState, useEffect, useRef } from "react";

import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { formatBusinessDateTime } from "@/lib/dates/format";
import {
  changeLpoDueDateAction,
  type ChangeLpoDueDateActionState,
} from "@/modules/lpo/application/change-lpo-due-date-action";

const initialState: ChangeLpoDueDateActionState = {
  ok: false,
  message: null,
};

type DueDateChangeItem = {
  id: string;
  field: "REVIEW" | "DELIVERY";
  oldValue: Date;
  newValue: Date;
  justification: string;
  createdAt: Date;
  changedBy: {
    name: string | null;
    email: string;
  };
};

export function LpoDueDateSection({
  lpoId,
  reviewDueAt,
  deliveryDueAt,
  history,
}: Readonly<{
  lpoId: string;
  reviewDueAt: Date;
  deliveryDueAt: Date;
  history: DueDateChangeItem[];
}>) {
  const boundAction = changeLpoDueDateAction.bind(null, lpoId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
        Due dates
      </h2>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Review due (Dubai)
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {formatBusinessDateTime(reviewDueAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Delivery due (Dubai)
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {formatBusinessDateTime(deliveryDueAt)}
          </dd>
        </div>
      </dl>

      <form ref={formRef} action={formAction} className="space-y-3 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-800">Change a due date</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Field</span>
            <select
              name="field"
              required
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue="REVIEW"
            >
              <option value="REVIEW">Review due</option>
              <option value="DELIVERY">Delivery due</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">
              New due date
            </span>
            <input
              type="date"
              name="newDueDate"
              required
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Justification (min 10 characters)
          </span>
          <textarea
            name="justification"
            required
            minLength={10}
            maxLength={2000}
            rows={3}
            placeholder="Why is this due date changing?"
            className="min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
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
          {isPending ? "Saving…" : "Update due date"}
        </button>
      </form>

      <div className="border-t border-zinc-100 pt-4">
        <h3 className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Change history
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No due date changes yet.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => {
              const author = item.changedBy.name ?? item.changedBy.email;
              return (
                <li
                  key={item.id}
                  className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-zinc-900">
                    {item.field === "REVIEW" ? "Review" : "Delivery"} due
                  </p>
                  <p className="text-xs text-zinc-600">
                    {formatBusinessDateTime(item.oldValue)} →{" "}
                    {formatBusinessDateTime(item.newValue)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-700">{item.justification}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {author} · <LocalDateTime value={item.createdAt} />
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
