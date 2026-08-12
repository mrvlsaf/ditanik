"use client";

import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useConfirmDelete } from "@/components/ui/useConfirmDelete";
import { deleteFabricBatchAction } from "@/modules/fabric/application/delete-fabric-action";

export function FabricBatchActionsMenu({
  batchId,
  fabricCode,
}: Readonly<{
  batchId: string;
  fabricCode: string;
}>) {
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete fabric batch ${fabricCode}?`,
    description:
      "This removes the batch and all of its movements from stock history. This cannot be undone.",
    onDelete: () => deleteFabricBatchAction(batchId),
  });

  const items: ActionsMenuItem[] = [
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
      <ActionsMenu items={items} label={`Actions for ${fabricCode}`} />
      {dialog}
    </>
  );
}
