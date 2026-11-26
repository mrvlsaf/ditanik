import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/AppShell";
import {
  WorkspaceName,
  WORKSPACE_FALLBACK_NAME,
} from "@/components/app-shell/WorkspaceName";
import {
  NotificationBellLoader,
  NotificationBellSkeleton,
} from "@/components/notifications/NotificationBellLoader";

export default async function AppSectionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  return (
    <AppShell
      userEmail={session.user.email}
      workspaceSlot={
        <Suspense fallback={WORKSPACE_FALLBACK_NAME}>
          <WorkspaceName />
        </Suspense>
      }
      notificationSlot={
        <Suspense fallback={<NotificationBellSkeleton />}>
          <NotificationBellLoader />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
