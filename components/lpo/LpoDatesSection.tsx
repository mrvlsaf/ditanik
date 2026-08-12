"use client";

import { LpoDateField } from "@prisma/client";
import { useActionState } from "react";

import {
  changeLpoDateAction,
  type ChangeLpoDateActionState,
} from "@/modules/lpo/application/change-lpo-date-action";
import { MIN_DATE_CHANGE_REASON_LENGTH } from "@/modules/lpo/domain/due-dates";
import {
  formatBusinessDateTime,
  formatCalendarDate,
} from "@/lib/dates/format";

const initialState: ChangeLpoDateActionState = {
  ok: false,
  message: null,
};

const FIELD_LABELS: Record<LpoDateField, string> = {
  ASSIGNMENT: "Manufacturer assignment date",
  PRODUCTION_DEADLINE: "Manufacturer production deadline",
  CLIENT_DELIVERY: "Client delivery date",
};

type DateChangeRow = {
  id: string;
  field: LpoDateField;
  oldValue: Date;
  newValue: Date;
  reason: string | null;
  createdAt: Date;
  changedBy: { email: string; name: string | null };
};

export function LpoDatesSection({
  lpoId,
  manufacturerAssignmentAt,
  productionDeadlineAt,
  clientDeliveryAt,
  dateChanges,
}: Readonly<{
  lpoId: string;
  manufacturerAssignmentAt: Date;
  productionDeadlineAt: Date;
  clientDeliveryAt: Date;
  dateChanges: DateChangeRow[];
}>) {
  const boundAction = changeLpoDateAction.bind(null, lpoId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );

  return (
    <section
      id="lpo-dates"
      className="scroll-mt-4 space-y-4 surface-card p-4 sm:p-6"
    >
      <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
        Dates
      </h2>

      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Manufacturer assignment
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {formatBusinessDateTime(manufacturerAssignmentAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Production deadline
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {formatBusinessDateTime(productionDeadlineAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Client delivery
          </dt>
          <dd className="mt-1 text-sm text-zinc-900">
            {formatBusinessDateTime(clientDeliveryAt)}
          </dd>
        </div>
      </dl>

      <form action={formAction} className="space-y-3 border-t border-zinc-100 pt-4">
        <p className="text-sm font-medium text-zinc-800">Extend a date</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">Field</span>
            <select
              name="field"
              required
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
              defaultValue={LpoDateField.ASSIGNMENT}
            >
              {Object.entries(FIELD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-700">New date</span>
            <input
              type="date"
              name="newDate"
              required
              className="min-h-11 w-full rounded-md border border-zinc-300 px-3 text-sm"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block text-zinc-700">
              Reason (required for assignment &amp; production deadline; optional
              for client delivery)
            </span>
            <textarea
              name="reason"
              rows={2}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder={`Min ${MIN_DATE_CHANGE_REASON_LENGTH} characters when required`}
            />
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
          className="btn-primary"
        >
          {isPending ? "Saving…" : "Save date change"}
        </button>
      </form>

      {dateChanges.length > 0 ? (
        <div className="border-t border-zinc-100 pt-4">
          <h3 className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
            Change history
          </h3>
          <ul className="space-y-2 text-sm text-zinc-700">
            {dateChanges.map((row) => (
              <li
                key={row.id}
                className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2"
              >
                <p className="font-medium text-zinc-900">
                  {FIELD_LABELS[row.field]}: {formatCalendarDate(row.oldValue)} →{" "}
                  {formatCalendarDate(row.newValue)}
                </p>
                {row.reason ? (
                  <p className="mt-0.5 text-zinc-600">{row.reason}</p>
                ) : null}
                <p className="mt-0.5 text-xs text-zinc-500">
                  {row.changedBy.name ?? row.changedBy.email} ·{" "}
                  {formatBusinessDateTime(row.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
