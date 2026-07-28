"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  addLpoCommentAction,
  type AddLpoCommentActionState,
} from "@/modules/lpo/application/add-lpo-comment-action";

const initialState: AddLpoCommentActionState = {
  ok: false,
  message: null,
};

export function AddLpoCommentForm({
  lpoId,
}: Readonly<{
  lpoId: string;
}>) {
  const boundAction = addLpoCommentAction.bind(null, lpoId);
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
    <form ref={formRef} action={formAction} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-800">Add comment</span>
        <textarea
          name="body"
          required
          rows={3}
          maxLength={2000}
          placeholder="Write a note about this LPO…"
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
        {isPending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
