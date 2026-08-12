import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell/AppShell";
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
