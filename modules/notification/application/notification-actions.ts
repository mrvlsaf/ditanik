"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/modules/notification/application/notifications";

export async function markNotificationReadAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, message: "You must be signed in." };
  }

  try {
    await markNotificationRead(id);
    revalidatePath("/notifications");
    revalidatePath("/lpo");
    return { ok: true as const };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not mark as read.";
    return { ok: false as const, message };
  }
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, message: "You must be signed in." };
  }

  try {
    await markAllNotificationsRead();
    revalidatePath("/notifications");
    revalidatePath("/lpo");
    return { ok: true as const };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Could not mark all as read.";
    return { ok: false as const, message };
  }
}
