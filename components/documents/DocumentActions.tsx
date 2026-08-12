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

/** Explicit View + Download buttons for a stored PDF. */
export function DocumentActions({ fileKey, fileName }: DocumentActionsProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setIsViewerOpen(true)}
        >
          View
        </button>
        <a href={fileUrl(fileKey, true)} className="btn-secondary">
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
