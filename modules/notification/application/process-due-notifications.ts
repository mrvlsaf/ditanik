import {
  NotificationEmailStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { Resend } from "resend";
import * as Sentry from "@sentry/nextjs";

import { absoluteAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import {
  actionPathFor,
  bodyForType,
  dubaiBusinessDayLabel,
  isAssignmentOverdue,
  isClientDeliveryOverdue,
  isProductionOverdue,
  isReviewPending,
  overdueDedupeKey,
  parseBusinessDayLabel,
  pendingDedupeKey,
  titleForType,
  type LpoDueSnapshot,
} from "@/modules/notification/domain/due-notification-rules";

export type ProcessDueNotificationsResult = {
  dryRun: boolean;
  reviewPendingCreated: number;
  assignmentOverdueCreated: number;
  productionOverdueCreated: number;
  clientDeliveryOverdueCreated: number;
  emailsSent: number;
  skipped: number;
  digestSent: boolean;
};

function notifyRecipient(): string | null {
  const explicit = process.env.OVERDUE_NOTIFY_EMAIL?.trim();
  if (explicit) {
    return explicit;
  }
  const allowlist = process.env.ALLOWED_EMAILS?.split(",")[0]?.trim();
  return allowlist || null;
}

function toSnapshot(
  row: {
    id: string;
    lpoNumber: string;
    nickname: string;
    status: LpoDueSnapshot["status"];
    manufacturerAssignmentAt: Date;
    productionDeadlineAt: Date;
    clientDeliveryAt: Date;
    manufacturer: { name: string } | null;
  },
): LpoDueSnapshot {
  return {
    id: row.id,
    lpoNumber: row.lpoNumber,
    nickname: row.nickname,
    status: row.status,
    manufacturerAssignmentAt: row.manufacturerAssignmentAt,
    productionDeadlineAt: row.productionDeadlineAt,
    clientDeliveryAt: row.clientDeliveryAt,
    manufacturerName: row.manufacturer?.name ?? null,
  };
}

async function createIfNew(input: {
  type: NotificationType;
  lpoId: string;
  dueAt: Date | null;
  businessDay: Date | null;
  dedupeKey: string;
  title: string;
  body: string;
  actionPath: string;
  recipient: string;
}): Promise<"created" | "skipped"> {
  try {
    await prisma.notification.create({
      data: {
        type: input.type,
        lpoId: input.lpoId,
        dueAt: input.dueAt,
        businessDay: input.businessDay,
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
        actionPath: input.actionPath,
        recipient: input.recipient,
        emailStatus: NotificationEmailStatus.PENDING,
      },
    });
    return "created";
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "skipped";
    }
    throw error;
  }
}

async function sendOverdueEmail(input: {
  resend: Resend | null;
  dryRun: boolean;
  from: string;
  recipient: string;
  notificationId: string;
  subject: string;
  textBody: string;
  actionPath: string;
}): Promise<"sent" | "dry_run" | "failed"> {
  const cta = absoluteAppUrl(input.actionPath);
  const text = `${input.textBody}\n\nOpen LPO: ${cta}`;

  if (input.dryRun || !input.resend) {
    await prisma.notification.update({
      where: { id: input.notificationId },
      data: {
        emailStatus: NotificationEmailStatus.DRY_RUN,
        emailSentAt: new Date(),
      },
    });
    return "dry_run";
  }

  try {
    await input.resend.emails.send({
      from: input.from,
      to: input.recipient,
      subject: input.subject,
      text,
      html: `<p>${input.textBody}</p><p><a href="${cta}">Open LPO and take action</a></p>`,
    });
    await prisma.notification.update({
      where: { id: input.notificationId },
      data: {
        emailStatus: NotificationEmailStatus.SENT,
        emailSentAt: new Date(),
      },
    });
    return "sent";
  } catch (error) {
    Sentry.captureException(error, {
      tags: { notificationId: input.notificationId, notificationType: "overdue" },
    });
    await prisma.notification.update({
      where: { id: input.notificationId },
      data: { emailStatus: NotificationEmailStatus.FAILED },
    });
    return "failed";
  }
}

/** Daily job: review-pending digests + one-shot overdue notifications with deep links. */
export async function processDueNotifications(
  now = new Date(),
): Promise<ProcessDueNotificationsResult> {
  const recipient = notifyRecipient();
  if (!recipient) {
    throw new Error("No OVERDUE_NOTIFY_EMAIL or ALLOWED_EMAILS configured.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const dryRun = !apiKey;
  const resend = apiKey ? new Resend(apiKey) : null;
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Ditanik <onboarding@resend.dev>";

  const dayLabel = dubaiBusinessDayLabel(now);
  const businessDay = parseBusinessDayLabel(dayLabel);

  let reviewPendingCreated = 0;
  let assignmentOverdueCreated = 0;
  let productionOverdueCreated = 0;
  let clientDeliveryOverdueCreated = 0;
  let emailsSent = 0;
  let skipped = 0;
  let digestSent = false;

  const lpos = await prisma.lpo.findMany({
    select: {
      id: true,
      lpoNumber: true,
      nickname: true,
      status: true,
      manufacturerAssignmentAt: true,
      productionDeadlineAt: true,
      clientDeliveryAt: true,
      manufacturer: { select: { name: true } },
    },
  });

  const snapshots = lpos.map(toSnapshot);
  const reviewPendingLpos: LpoDueSnapshot[] = [];

  for (const lpo of snapshots) {
    if (isReviewPending(lpo)) {
      reviewPendingLpos.push(lpo);
      const type = NotificationType.REVIEW_PENDING;
      const actionPath = actionPathFor(type, lpo.id);
      const result = await createIfNew({
        type,
        lpoId: lpo.id,
        dueAt: null,
        businessDay,
        dedupeKey: pendingDedupeKey(lpo.id, type, dayLabel),
        title: titleForType(type, lpo.lpoNumber),
        body: bodyForType(type, lpo),
        actionPath,
        recipient,
      });
      if (result === "created") {
        reviewPendingCreated += 1;
      } else {
        skipped += 1;
      }
    }

    if (isAssignmentOverdue(lpo, now)) {
      const type = NotificationType.ASSIGNMENT_OVERDUE;
      const dueAt = lpo.manufacturerAssignmentAt;
      const actionPath = actionPathFor(type, lpo.id);
      const result = await createIfNew({
        type,
        lpoId: lpo.id,
        dueAt,
        businessDay: null,
        dedupeKey: overdueDedupeKey(lpo.id, type, dueAt),
        title: titleForType(type, lpo.lpoNumber),
        body: bodyForType(type, lpo),
        actionPath,
        recipient,
      });
      if (result === "created") {
        assignmentOverdueCreated += 1;
        const created = await prisma.notification.findUnique({
          where: { dedupeKey: overdueDedupeKey(lpo.id, type, dueAt) },
        });
        if (created && created.emailStatus === NotificationEmailStatus.PENDING) {
          const sendResult = await sendOverdueEmail({
            resend,
            dryRun,
            from,
            recipient,
            notificationId: created.id,
            subject: created.title,
            textBody: created.body,
            actionPath: created.actionPath,
          });
          if (sendResult === "sent") {
            emailsSent += 1;
          }
        }
      } else {
        skipped += 1;
      }
    }

    if (isProductionOverdue(lpo, now)) {
      const type = NotificationType.PRODUCTION_OVERDUE;
      const dueAt = lpo.productionDeadlineAt;
      const actionPath = actionPathFor(type, lpo.id);
      const result = await createIfNew({
        type,
        lpoId: lpo.id,
        dueAt,
        businessDay: null,
        dedupeKey: overdueDedupeKey(lpo.id, type, dueAt),
        title: titleForType(type, lpo.lpoNumber),
        body: bodyForType(type, lpo),
        actionPath,
        recipient,
      });
      if (result === "created") {
        productionOverdueCreated += 1;
        const created = await prisma.notification.findUnique({
          where: { dedupeKey: overdueDedupeKey(lpo.id, type, dueAt) },
        });
        if (created && created.emailStatus === NotificationEmailStatus.PENDING) {
          const sendResult = await sendOverdueEmail({
            resend,
            dryRun,
            from,
            recipient,
            notificationId: created.id,
            subject: created.title,
            textBody: created.body,
            actionPath: created.actionPath,
          });
          if (sendResult === "sent") {
            emailsSent += 1;
          }
        }
      } else {
        skipped += 1;
      }
    }

    if (isClientDeliveryOverdue(lpo, now)) {
      const type = NotificationType.CLIENT_DELIVERY_OVERDUE;
      const dueAt = lpo.clientDeliveryAt;
      const actionPath = actionPathFor(type, lpo.id);
      const result = await createIfNew({
        type,
        lpoId: lpo.id,
        dueAt,
        businessDay: null,
        dedupeKey: overdueDedupeKey(lpo.id, type, dueAt),
        title: titleForType(type, lpo.lpoNumber),
        body: bodyForType(type, lpo),
        actionPath,
        recipient,
      });
      if (result === "created") {
        clientDeliveryOverdueCreated += 1;
        const created = await prisma.notification.findUnique({
          where: { dedupeKey: overdueDedupeKey(lpo.id, type, dueAt) },
        });
        if (created && created.emailStatus === NotificationEmailStatus.PENDING) {
          const sendResult = await sendOverdueEmail({
            resend,
            dryRun,
            from,
            recipient,
            notificationId: created.id,
            subject: created.title,
            textBody: created.body,
            actionPath: created.actionPath,
          });
          if (sendResult === "sent") {
            emailsSent += 1;
          }
        }
      } else {
        skipped += 1;
      }
    }
  }

  // One digest email for today's newly created (or still pending) review reminders.
  const pendingReviewToday = await prisma.notification.findMany({
    where: {
      type: NotificationType.REVIEW_PENDING,
      businessDay,
      emailStatus: NotificationEmailStatus.PENDING,
    },
    include: {
      lpo: { select: { lpoNumber: true, nickname: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (pendingReviewToday.length > 0) {
    const lines = pendingReviewToday.map((row) => {
      const url = absoluteAppUrl(row.actionPath);
      return `- LPO ${row.lpo.lpoNumber} (${row.lpo.nickname}): ${url}`;
    });
    const subject = `[Ditanik] ${pendingReviewToday.length} LPO(s) still under review`;
    const text = `These LPOs are still under review and need manufacturer assignment:\n\n${lines.join("\n")}`;
    const html = `<p>These LPOs are still under review and need manufacturer assignment:</p><ul>${pendingReviewToday
      .map(
        (row) =>
          `<li><a href="${absoluteAppUrl(row.actionPath)}">LPO ${row.lpo.lpoNumber} (${row.lpo.nickname})</a></li>`,
      )
      .join("")}</ul>`;

    let digestStatus: NotificationEmailStatus = NotificationEmailStatus.DRY_RUN;
    if (!dryRun && resend) {
      try {
        await resend.emails.send({
          from,
          to: recipient,
          subject,
          text,
          html,
        });
        digestStatus = NotificationEmailStatus.SENT;
        emailsSent += 1;
      } catch (error) {
        Sentry.captureException(error, {
          tags: { notificationType: "review_pending_digest" },
        });
        digestStatus = NotificationEmailStatus.FAILED;
      }
    }

    await prisma.notification.updateMany({
      where: { id: { in: pendingReviewToday.map((row) => row.id) } },
      data: {
        emailStatus: digestStatus,
        emailSentAt: new Date(),
      },
    });
    digestSent = digestStatus !== NotificationEmailStatus.FAILED;
  }

  return {
    dryRun,
    reviewPendingCreated,
    assignmentOverdueCreated,
    productionOverdueCreated,
    clientDeliveryOverdueCreated,
    emailsSent: dryRun ? 0 : emailsSent,
    skipped,
    digestSent,
  };
}
