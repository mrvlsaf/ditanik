"use client";

import { useState } from "react";

import { DocumentViewer } from "@/components/documents/DocumentViewer";

type DocumentActionsProps = Readonly<{
  fileKey: string;
  fileName: string;
}>;

function fileUrl(fileKey: string, download = false): string {
  const params = new URLSearchParams({ key: fileKey });
  if (download) {
    params.set("download", "1");
  }
  return `/api/files?${params.toString()}`;
}

/** View (in-app) + Download controls for a stored PDF. */
export function DocumentActions({ fileKey, fileName }: DocumentActionsProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIsViewerOpen(true)}
          className="min-h-9 rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 sm:text-sm"
        >
          View
        </button>
        <a
          href={fileUrl(fileKey, true)}
          className="inline-flex min-h-9 items-center rounded-md border border-zinc-300 px-3 text-xs font-medium text-zinc-800 hover:bg-zinc-50 sm:text-sm"
        >
          Download
        </a>
      </div>

      {isViewerOpen ? (
        <DocumentViewer
          fileUrl={fileUrl(fileKey)}
          title={fileName}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
    </>
  );
}
