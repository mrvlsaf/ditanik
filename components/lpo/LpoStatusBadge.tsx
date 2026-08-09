"use client";

import { LpoStatus } from "@prisma/client";

import { lpoStatusLabel } from "@/modules/lpo/domain/lpo-status";

const STATUS_STYLES: Record<LpoStatus, string> = {
  LPO_RECEIVED: "bg-zinc-100 text-zinc-800",
  UNDER_REVIEW: "bg-amber-50 text-amber-900",
  ASSIGNED_TO_MANUFACTURER: "bg-sky-50 text-sky-900",
  CLIENT_DELIVERY_COMPLETED: "bg-emerald-50 text-emerald-900",
};

export function LpoStatusBadge({
  status,
}: Readonly<{
  status: LpoStatus;
}>) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {lpoStatusLabel(status)}
    </span>
  );
}
