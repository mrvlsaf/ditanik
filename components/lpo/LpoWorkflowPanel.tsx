"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { DocumentActions } from "@/components/documents/DocumentActions";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import {
  attachReviewPdfAction,
  markLpoAsDeliveredAction,
  markLpoAsReviewedAction,
  type LpoActionState,
} from "@/modules/lpo/application/lpo-transition-actions";
import {
  canMarkLpoAsDelivered,
  canMarkLpoAsReviewed,
} from "@/modules/lpo/domain/lpo-status";

const initialState: LpoActionState = {
  ok: false,
  message: null,
};

type LpoWorkflowPanelProps = Readonly<{
  lpoId: string;
  status: "PENDING" | "REVIEWED" | "DELIVERED";
  reviewFileKey: string | null;
  reviewFileName: string | null;
  reviewedAt: Date | null;
  deliveredAt: Date | null;
}>;

export function LpoWorkflowPanel({
  lpoId,
  status,
  reviewFileKey,
  reviewFileName,
  reviewedAt,
  deliveredAt,
}: LpoWorkflowPanelProps) {
  const canReview = canMarkLpoAsReviewed({ status, reviewFileKey });
  const canDeliver = canMarkLpoAsDelivered(status);
  const isPendingStatus = status === "PENDING";

  const boundUpload = attachReviewPdfAction.bind(null, lpoId);
  const [uploadState, uploadAction, isUploading] = useActionState(
    boundUpload,
    initialState,
  );
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [transitionState, setTransitionState] =
    useState<LpoActionState>(initialState);
  const [isMarking, startMarkTransition] = useTransition();

  useEffect(() => {
    if (uploadState.ok) {
      uploadFormRef.current?.reset();
    }
  }, [uploadState]);

  function onMarkReviewed() {
    startMarkTransition(async () => {
      const result = await markLpoAsReviewedAction(lpoId);
      setTransitionState(result);
    });
  }

  function onMarkDelivered() {
    startMarkTransition(async () => {
      const result = await markLpoAsDeliveredAction(lpoId);
      setTransitionState(result);
    });
  }

  const feedback = transitionState.message
    ? transitionState
    : uploadState.message
      ? uploadState
      : null;

  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 sm:p-6">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
        Review & delivery
      </h2>

      <div className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Review PDF
        </p>
        {reviewFileKey && reviewFileName ? (
          <div className="space-y-2">
            <p className="text-sm text-zinc-800">{reviewFileName}</p>
            <DocumentActions fileKey={reviewFileKey} fileName={reviewFileName} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Upload a separate review PDF before marking as Reviewed.
          </p>
        )}

        {isPendingStatus ? (
          <form ref={uploadFormRef} action={uploadAction} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">
                {reviewFileKey ? "Replace review PDF" : "Upload review PDF"}
              </span>
              <input
                type="file"
                name="file"
                accept="application/pdf,.pdf"
                required
                className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </label>
            <button
              type="submit"
              disabled={isUploading}
              className="min-h-11 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {isUploading ? "Uploading…" : "Save review PDF"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
        {status === "PENDING" ? (
          <button
            type="button"
            disabled={!canReview || isMarking}
            onClick={onMarkReviewed}
            className="min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarking ? "Updating…" : "Mark as Reviewed"}
          </button>
        ) : null}

        {status === "REVIEWED" ? (
          <button
            type="button"
            disabled={!canDeliver || isMarking}
            onClick={onMarkDelivered}
            className="min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isMarking ? "Updating…" : "Mark as Delivered"}
          </button>
        ) : null}

        {status === "DELIVERED" ? (
          <p className="text-sm text-emerald-700">This LPO is delivered.</p>
        ) : null}
      </div>

      {!canReview && status === "PENDING" ? (
        <p className="text-xs text-zinc-500">
          Mark as Reviewed stays disabled until a review PDF is uploaded.
        </p>
      ) : null}

      {reviewedAt ? (
        <p className="text-xs text-zinc-500">
          Reviewed <LocalDateTime value={reviewedAt} />
        </p>
      ) : null}
      {deliveredAt ? (
        <p className="text-xs text-zinc-500">
          Delivered <LocalDateTime value={deliveredAt} />
        </p>
      ) : null}

      {feedback?.message ? (
        <output
          className={`block text-sm ${feedback.ok ? "text-emerald-700" : "text-red-700"}`}
        >
          {feedback.message}
        </output>
      ) : null}
    </section>
  );
}
