"use client";

import { LpoDateField } from "@prisma/client";
import { useActionState } from "react";

import { useGlobalPending } from "@/components/app-shell/GlobalLoadingProvider";
import { Chip } from "@/components/ui/Chip";

import {
  changeLpoDateAction,
  type ChangeLpoDateActionState,
} from "@/modules/lpo/application/change-lpo-date-action";
import { MIN_DATE_CHANGE_REASON_LENGTH } from "@/modules/lpo/domain/due-dates";
import { extensionLabel, isExtended } from "@/modules/lpo/domain/lpo-detail";
import { formatBusinessDateTime, formatCalendarDate } from "@/lib/dates/format";

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
  const [state, formAction, isPending] = useActionState(boundAction, initialState);
  useGlobalPending(isPending);

  const keyDates: Array<{ field: LpoDateField; value: Date }> = [
    { field: LpoDateField.ASSIGNMENT, value: manufacturerAssignmentAt },
    { field: LpoDateField.PRODUCTION_DEADLINE, value: productionDeadlineAt },
    { field: LpoDateField.CLIENT_DELIVERY, value: clientDeliveryAt },
  ];

  return (
    <section id="lpo-dates" className="scroll-mt-4 space-y-4 surface-card p-4 sm:p-6">
      <h2 className="text-base font-bold text-[var(--foreground)]">Key dates</h2>

      <div className="overflow-x-auto">
        <table className="table-stack w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-semibold tracking-wide text-[var(--text-muted)] uppercase">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">When</th>
              <th className="py-2 pr-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {keyDates.map((row) => (
              <tr
                key={row.field}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td
                  data-label="Date"
                  className="py-2.5 pr-3 font-medium text-[var(--foreground)]"
                >
                  {FIELD_LABELS[row.field]}
                </td>
                <td data-label="When" className="py-2.5 pr-3 text-[var(--foreground)]">
                  {formatBusinessDateTime(row.value)}
                </td>
                <td data-label="Status" className="py-2.5 pr-3">
                  <Chip tone={isExtended(dateChanges, row.field) ? "amber" : "gray"}>
                    {extensionLabel(dateChanges, row.field)}
                  </Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={formAction} className="space-y-3 border-t border-zinc-100 pt-4">
        <h3 className="text-base font-bold text-[var(--foreground)]">Extend a date</h3>
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
              Reason (required for assignment &amp; production deadline; optional for
              client delivery)
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
        <button type="submit" disabled={isPending} className="btn-primary">
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
                {row.reason ? <p className="mt-0.5 text-zinc-600">{row.reason}</p> : null}
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
