"use client";

import { useState } from "react";

import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useConfirmDelete } from "@/components/ui/useConfirmDelete";
import { deleteFabricInvoiceAction } from "@/modules/fabric/application/delete-fabric-action";

function fileUrl(fileKey: string, download = false): string {
  const params = new URLSearchParams({ key: fileKey });
  if (download) {
    params.set("download", "1");
  }
  return `/api/files?${params.toString()}`;
}

export function InvoiceActionsMenu({
  invoiceId,
  invoiceRef,
  fileKey,
  fileName,
}: Readonly<{
  invoiceId: string;
  invoiceRef: string;
  fileKey: string | null;
  fileName: string | null;
}>) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete invoice ${invoiceRef}?`,
    description:
      "This removes the invoice PDF reference, all fabric batches on it, and their movements. This cannot be undone.",
    onDelete: () => deleteFabricInvoiceAction(invoiceId),
  });

  const items: ActionsMenuItem[] = [];

  if (fileKey && fileName) {
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
    kind: "button",
    id: "delete",
    label: "Delete",
    tone: "danger",
    disabled: isPending,
    onSelect: requestDelete,
  });

  return (
    <>
      <ActionsMenu items={items} label={`Actions for invoice ${invoiceRef}`} />
      {dialog}
      {isViewerOpen && fileKey && fileName ? (
        <DocumentViewer
          fileUrl={fileUrl(fileKey)}
          title={fileName}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
    </>
  );
}
