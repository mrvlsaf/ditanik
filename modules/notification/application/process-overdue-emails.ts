import { Resend } from "resend";

import { prisma } from "@/lib/db";

export type OverdueEmailRunResult = {
  checkedAt: string;
  reviewOverdueSent: number;
  deliveryOverdueSent: number;
  dryRun: boolean;
  details: string[];
};

function resolveRecipient(): string {
  const explicit = process.env.OVERDUE_NOTIFY_EMAIL?.trim();
  if (explicit) return explicit;
  const allowlist = process.env.ALLOWED_EMAILS?.split(",")[0]?.trim();
  if (allowlist) return allowlist;
  throw new Error("Set OVERDUE_NOTIFY_EMAIL or ALLOWED_EMAILS for overdue mail.");
}

/** Finds overdue LPOs and sends at most one email per LPO + type + dueAt. */
export async function processOverdueEmails(
  now = new Date(),
): Promise<OverdueEmailRunResult> {
  const recipient = resolveRecipient();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const dryRun = !apiKey;
  const resend = apiKey ? new Resend(apiKey) : null;
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Ditanik <onboarding@resend.dev>";

  const details: string[] = [];
  let reviewOverdueSent = 0;
  let deliveryOverdueSent = 0;

  const reviewCandidates = await prisma.lpo.findMany({
    where: {
      status: "PENDING",
      reviewDueAt: { lt: now },
    },
    select: {
      id: true,
      lpoNumber: true,
      reviewDueAt: true,
    },
  });

  for (const lpo of reviewCandidates) {
    const already = await prisma.emailNotification.findUnique({
      where: {
        lpoId_type_dueAt: {
          lpoId: lpo.id,
          type: "REVIEW_OVERDUE",
          dueAt: lpo.reviewDueAt,
        },
      },
    });
    if (already) continue;

    const subject = `[Ditanik] Review overdue: ${lpo.lpoNumber}`;
    const body = `LPO ${lpo.lpoNumber} is past its review due date (${lpo.reviewDueAt.toISOString()}).`;

    if (resend) {
      await resend.emails.send({
        from,
        to: recipient,
        subject,
        text: body,
      });
    } else {
      details.push(`DRY_RUN review: ${subject} → ${recipient}`);
    }

    await prisma.emailNotification.create({
      data: {
        lpoId: lpo.id,
        type: "REVIEW_OVERDUE",
        dueAt: lpo.reviewDueAt,
        recipient,
        dryRun,
      },
    });
    reviewOverdueSent += 1;
  }

  const deliveryCandidates = await prisma.lpo.findMany({
    where: {
      status: { not: "DELIVERED" },
      deliveryDueAt: { lt: now },
    },
    select: {
      id: true,
      lpoNumber: true,
      deliveryDueAt: true,
      status: true,
    },
  });

  for (const lpo of deliveryCandidates) {
    const already = await prisma.emailNotification.findUnique({
      where: {
        lpoId_type_dueAt: {
          lpoId: lpo.id,
          type: "DELIVERY_OVERDUE",
          dueAt: lpo.deliveryDueAt,
        },
      },
    });
    if (already) continue;

    const subject = `[Ditanik] Delivery overdue: ${lpo.lpoNumber}`;
    const body = `LPO ${lpo.lpoNumber} (${lpo.status}) is past its delivery due date (${lpo.deliveryDueAt.toISOString()}).`;

    if (resend) {
      await resend.emails.send({
        from,
        to: recipient,
        subject,
        text: body,
      });
    } else {
      details.push(`DRY_RUN delivery: ${subject} → ${recipient}`);
    }

    await prisma.emailNotification.create({
      data: {
        lpoId: lpo.id,
        type: "DELIVERY_OVERDUE",
        dueAt: lpo.deliveryDueAt,
        recipient,
        dryRun,
      },
    });
    deliveryOverdueSent += 1;
  }

  return {
    checkedAt: now.toISOString(),
    reviewOverdueSent,
    deliveryOverdueSent,
    dryRun,
    details,
  };
}
