"use client";

import { useState } from "react";

import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useConfirmDelete } from "@/components/ui/useConfirmDelete";
import { deleteLpoAction } from "@/modules/lpo/application/delete-lpo-action";

function fileUrl(fileKey: string, download = false): string {
  const params = new URLSearchParams({ key: fileKey });
  if (download) {
    params.set("download", "1");
  }
  return `/api/files?${params.toString()}`;
}

export function LpoActionsMenu({
  lpoId,
  lpoNumber,
  fileKey,
  fileName,
  redirectTo,
}: Readonly<{
  lpoId: string;
  lpoNumber: string;
  fileKey: string;
  fileName: string;
  redirectTo?: string;
}>) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete LPO ${lpoNumber}?`,
    description:
      "This permanently removes the LPO and related requirements/notifications. This cannot be undone.",
    onDelete: () => deleteLpoAction(lpoId),
    redirectTo,
  });

  const items: ActionsMenuItem[] = [
    {
      kind: "button",
      id: "view",
      label: "View",
      onSelect: () => setIsViewerOpen(true),
    },
    {
      kind: "link",
      id: "download",
      label: "Download",
      href: fileUrl(fileKey, true),
    },
    {
      kind: "button",
      id: "delete",
      label: "Delete",
      tone: "danger",
      disabled: isPending,
      onSelect: requestDelete,
    },
  ];

  return (
    <>
      <ActionsMenu items={items} label={`Actions for LPO ${lpoNumber}`} />
      {dialog}
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
