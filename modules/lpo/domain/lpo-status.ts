import { LpoStatus } from "@prisma/client";

export type LpoStatusGate = {
  status: LpoStatus;
  productionFileKey: string | null;
  manufacturerId: string | null;
};

/** Create lands briefly as Received; app auto-moves to Under Review in the same flow. */
export function initialStatusAfterCreate(): LpoStatus {
  return LpoStatus.UNDER_REVIEW;
}

export function canAssignManufacturer(lpo: LpoStatusGate): boolean {
  return lpo.status === LpoStatus.UNDER_REVIEW;
}

export function canMarkClientDeliveryCompleted(lpo: LpoStatusGate): boolean {
  return (
    lpo.status === LpoStatus.ASSIGNED_TO_MANUFACTURER &&
    Boolean(lpo.manufacturerId) &&
    Boolean(lpo.productionFileKey)
  );
}

export function assertCanAssignManufacturer(lpo: LpoStatusGate): void {
  if (!canAssignManufacturer(lpo)) {
    throw new Error(
      "Cannot assign manufacturer: LPO must be Under Review.",
    );
  }
}

export function assertCanMarkClientDeliveryCompleted(lpo: LpoStatusGate): void {
  if (!canMarkClientDeliveryCompleted(lpo)) {
    throw new Error(
      "Cannot complete client delivery: LPO must be assigned to a manufacturer with a production file.",
    );
  }
}

/** Dashboard / badge labels (Production Deadline is phase copy while Assigned). */
export function lpoStatusLabel(status: LpoStatus): string {
  switch (status) {
    case LpoStatus.LPO_RECEIVED:
      return "LPO Received";
    case LpoStatus.UNDER_REVIEW:
      return "Under Review";
    case LpoStatus.ASSIGNED_TO_MANUFACTURER:
      return "Production Deadline";
    case LpoStatus.CLIENT_DELIVERY_COMPLETED:
      return "Client Delivery Completed";
    default:
      return status;
  }
}

export function lpoStatusDetailLabel(status: LpoStatus): string {
  switch (status) {
    case LpoStatus.ASSIGNED_TO_MANUFACTURER:
      return "Assigned to Manufacturer";
    default:
      return lpoStatusLabel(status);
  }
}
