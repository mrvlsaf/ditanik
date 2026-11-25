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
  includeDocumentActions = true,
  trigger,
}: Readonly<{
  lpoId: string;
  lpoNumber: string;
  /** Null for an urgent LPO created without the customer's PDF. */
  fileKey: string | null;
  fileName: string | null;
  redirectTo?: string;
  /** When false, only Delete stays in the ⋮ menu (detail page shows View/Download inline). */
  includeDocumentActions?: boolean;
  /** "more" shows a text button reading More instead of the three-dot icon. */
  trigger?: "kebab" | "more";
}>) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete LPO ${lpoNumber}?`,
    description:
      "This permanently removes the LPO and related requirements/notifications. This cannot be undone.",
    onDelete: () => deleteLpoAction(lpoId),
    redirectTo,
  });

  const items: ActionsMenuItem[] = [];

  if (includeDocumentActions && fileKey && fileName) {
    items.push(
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
    );
  }

  items.push({
    kind: "link",
    id: "edit",
    label: "Edit details",
    href: `/lpo/${lpoId}/edit`,
  });

  items.push({
    kind: "button",
    id: "delete",
    label: "Delete",
    tone: "danger",
    disabled: isPending,
    onSelect: requestDelete,
  });

  return (
    <>
      <ActionsMenu
        items={items}
        label={`Actions for LPO ${lpoNumber}`}
        trigger={trigger}
      />
      {dialog}
      {includeDocumentActions && fileKey && fileName && isViewerOpen ? (
        <DocumentViewer
          fileUrl={fileUrl(fileKey)}
          title={fileName}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
    </>
  );
}
