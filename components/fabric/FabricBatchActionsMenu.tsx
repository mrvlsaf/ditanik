"use client";

import { ActionsMenu, type ActionsMenuItem } from "@/components/ui/ActionsMenu";
import { useConfirmDelete } from "@/components/ui/useConfirmDelete";
import { useNavigateWithLoader } from "@/components/ui/useNavigateWithLoader";
import { withRequestNonce } from "@/lib/with-request-nonce";
import { deleteFabricBatchAction } from "@/modules/fabric/application/delete-fabric-action";

export function FabricBatchActionsMenu({
  batchId,
  fabricCode,
}: Readonly<{
  batchId: string;
  fabricCode: string;
}>) {
  const navigate = useNavigateWithLoader();
  const { requestDelete, isPending, dialog } = useConfirmDelete({
    title: `Delete fabric batch ${fabricCode}?`,
    description:
      "This removes the batch and all of its movements from stock history. This cannot be undone.",
    onDelete: () => deleteFabricBatchAction(batchId),
  });

  const items: ActionsMenuItem[] = [
    {
      kind: "button",
      id: "return",
      label: "Record a return",
      onSelect: () => navigate(withRequestNonce(`/fabric?tab=return&batch=${batchId}`)),
    },
    {
      kind: "button",
      id: "delete",
      label: "Delete batch",
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
