"use client";

import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useConfirmDelete } from "@/components/ui/useConfirmDelete";
import { deleteManufacturerAction } from "@/modules/manufacturer/application/delete-manufacturer-action";

export function ManufacturerActionsMenu({
  manufacturerId,
  name,
  redirectTo,
  showLedgerLink = true,
}: Readonly<{
  manufacturerId: string;
  name: string;
  redirectTo?: string;
  showLedgerLink?: boolean;
}>) {
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete manufacturer “${name}”?`,
    description:
      "If this manufacturer is assigned to LPOs, delete will be blocked. Unused manufacturers are removed; those with fabric history only are deactivated.",
    onDelete: () => deleteManufacturerAction(manufacturerId),
    redirectTo,
  });

  const items: ActionsMenuItem[] = [];

  if (showLedgerLink) {
    items.push({
      kind: "link",
      id: "ledger",
      label: "Fabric ledger",
      href: `/manufacturers/${manufacturerId}`,
    });
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
      <ActionsMenu items={items} label={`Actions for ${name}`} />
      {dialog}
    </>
  );
}
