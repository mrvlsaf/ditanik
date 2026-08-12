"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type DeleteResult = { ok: true } | { ok: false; message: string };

/**
 * Shared confirm → delete → refresh/redirect flow for action menus.
 * Renders a ConfirmDialog; call `requestDelete()` from the menu item.
 */
export function useConfirmDelete({
  title,
  description,
  confirmLabel = "Delete",
  onDelete,
  redirectTo,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  onDelete: () => Promise<DeleteResult>;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const requestDelete = useCallback(() => {
    setError(null);
    setOpen(true);
  }, []);

  const onCancel = useCallback(() => {
    if (!isPending) {
      setOpen(false);
      setError(null);
    }
  }, [isPending]);

  const onConfirm = useCallback(() => {
    startTransition(async () => {
      const result = await onDelete();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    });
  }, [onDelete, redirectTo, router]);

  const dialog = (
    <ConfirmDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      tone="danger"
      isPending={isPending}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );

  return { requestDelete, isPending, dialog };
}
