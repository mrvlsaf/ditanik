import { Suspense } from "react";

import { PageContainer } from "@/components/app-shell/PageContainer";
import { SectionLoading } from "@/components/app-shell/SectionLoading";
import { NotificationsList } from "@/components/notifications/NotificationsList";
import { listNotifications } from "@/modules/notification/application/notifications";

async function NotificationsContent() {
  const rows = await listNotifications({ take: 100 });

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    actionPath: row.actionPath,
    type: row.type,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lpoNumber: row.lpo.lpoNumber,
    nickname: row.lpo.nickname,
  }));

  return <NotificationsList items={items} />;
}

export default function NotificationsPage() {
  return (
    <PageContainer
      title="Notifications"
      description="Due reminders and overdue alerts for LPO actions."
    >
      <Suspense fallback={<SectionLoading label="Loading notifications…" />}>
        <NotificationsContent />
      </Suspense>
    </PageContainer>
  );
}
