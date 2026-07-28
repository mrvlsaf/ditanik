import { LpoStatus } from "@prisma/client";

export type LpoReviewGate = {
  status: LpoStatus;
  reviewFileKey: string | null;
};

/** Review PDF must exist before Pending → Reviewed. */
export function canMarkLpoAsReviewed(lpo: LpoReviewGate): boolean {
  return lpo.status === LpoStatus.PENDING && Boolean(lpo.reviewFileKey);
}

/** Delivered only from Reviewed. */
export function canMarkLpoAsDelivered(status: LpoStatus): boolean {
  return status === LpoStatus.REVIEWED;
}

export type LpoTransition = "mark_reviewed" | "mark_delivered";

/** Throws if the status change is not allowed. */
export function assertLpoTransition(
  lpo: LpoReviewGate,
  transition: LpoTransition,
): void {
  if (transition === "mark_reviewed" && !canMarkLpoAsReviewed(lpo)) {
    throw new Error(
      "Cannot mark as Reviewed: LPO must be Pending and have a review PDF uploaded.",
    );
  }

  if (transition === "mark_delivered" && !canMarkLpoAsDelivered(lpo.status)) {
    throw new Error("Cannot mark as Delivered: LPO must be in Reviewed status.");
  }
}

export function nextStatusForTransition(transition: LpoTransition): LpoStatus {
  return transition === "mark_reviewed" ? LpoStatus.REVIEWED : LpoStatus.DELIVERED;
}
