import { LpoStatus } from "@prisma/client";

import { Chip, type ChipTone } from "@/components/ui/Chip";
import { lpoStatusLabel } from "@/modules/lpo/domain/lpo-status";

const STATUS_TONE: Record<LpoStatus, ChipTone> = {
  LPO_RECEIVED: "gray",
  UNDER_REVIEW: "amber",
  ASSIGNED_TO_MANUFACTURER: "blue",
  CLIENT_DELIVERY_COMPLETED: "green",
};

export function LpoStatusBadge({
  status,
}: Readonly<{
  status: LpoStatus;
}>) {
  return <Chip tone={STATUS_TONE[status]}>{lpoStatusLabel(status)}</Chip>;
}
