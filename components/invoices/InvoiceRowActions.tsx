"use client";

import { useState } from "react";

import { DocumentViewer } from "@/components/documents/DocumentViewer";
import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useConfirmDelete } from "@/components/ui/useConfirmDelete";
import { deleteFabricInvoiceAction } from "@/modules/fabric/application/delete-fabric-action";
import { deleteSupplierInvoiceAction } from "@/modules/invoices/application/delete-supplier-invoice-action";
import type { InvoiceType } from "@/modules/invoices/domain/invoice-types";
import { fileUrl } from "@/lib/files/file-url";

const OPEN_LINK: Record<InvoiceType, { label: string; href: string }> = {
  tax: { label: "Open in Documents", href: "/documents" },
  fabric: { label: "See batches in stock", href: "/fabric" },
  accessory: { label: "Add another invoice", href: "/invoices/new?type=accessory" },
  manufacturing: {
    label: "Add another invoice",
    href: "/invoices/new?type=manufacturing",
  },
};

const DELETE_TEXT: Record<Exclude<InvoiceType, "tax">, string> = {
  fabric:
    "This removes the invoice, all fabric batches on it, and their movements. If fabric from it was already used, it is hidden instead. This cannot be undone.",
  accessory: "This removes the invoice and its lines. This cannot be undone.",
  manufacturing: "This removes the invoice and its lines. This cannot be undone.",
};

/** The Download / View PDF button and the More menu on one row of the Invoices list. */
export function InvoiceRowActions({
  type,
  id,
  reference,
  fileKey,
  fileName,
}: Readonly<{
  type: InvoiceType;
  id: string;
  reference: string;
  fileKey: string | null;
  fileName: string | null;
}>) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete invoice ${reference}?`,
    description: type === "tax" ? "" : DELETE_TEXT[type],
    onDelete: () =>
      type === "fabric" ? deleteFabricInvoiceAction(id) : deleteSupplierInvoiceAction(id),
  });

  const open = OPEN_LINK[type];
  const items: ActionsMenuItem[] = [];
  if (fileKey) {
    items.push({
      kind: "link",
      id: "download",
      label: type === "tax" ? "Download file" : "Download PDF",
      href: fileUrl(fileKey, true),
    });
  }
  items.push({ kind: "link", id: "open", label: open.label, href: open.href });
  // Tax invoices are deleted from Documents; the others are managed here.
  if (type !== "tax") {
    items.push({
      kind: "button",
      id: "delete",
      label: "Delete invoice",
      tone: "danger",
      disabled: isPending,
      onSelect: requestDelete,
    });
  }

  return (
    <span className="flex items-center gap-2">
      {fileKey && fileName ? (
        type === "tax" ? (
          <a href={fileUrl(fileKey, true)} className="btn-secondary">
            Download
          </a>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsViewerOpen(true)}
          >
            View PDF
          </button>
        )
      ) : null}
      <ActionsMenu
        items={items}
        label={`Actions for invoice ${reference}`}
        trigger="more"
      />
      {dialog}
      {isViewerOpen && fileKey && fileName ? (
        <DocumentViewer
          fileUrl={fileUrl(fileKey)}
          title={fileName}
          onClose={() => setIsViewerOpen(false)}
        />
      ) : null}
    </span>
  );
}
