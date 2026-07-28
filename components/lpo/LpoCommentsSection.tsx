import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { AddLpoCommentForm } from "@/components/lpo/AddLpoCommentForm";

type CommentItem = {
  id: string;
  body: string;
  createdAt: Date;
  createdBy: {
    name: string | null;
    email: string;
  };
};

export function LpoCommentsSection({
  lpoId,
  comments,
}: Readonly<{
  lpoId: string;
  comments: CommentItem[];
}>) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
        Comments
      </h2>

      {comments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white px-4 py-6 text-sm text-zinc-500">
          No comments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((comment) => {
            const author = comment.createdBy.name ?? comment.createdBy.email;
            return (
              <li
                key={comment.id}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3"
              >
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">{author}</p>
                  <LocalDateTime
                    value={comment.createdAt}
                    className="text-xs text-zinc-500"
                  />
                </div>
                <p className="whitespace-pre-wrap text-sm text-zinc-700">
                  {comment.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-4 sm:p-5">
        <AddLpoCommentForm lpoId={lpoId} />
      </div>
    </section>
  );
}
