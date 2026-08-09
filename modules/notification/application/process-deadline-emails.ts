import { DeadlineEmailType, LpoStatus } from "@prisma/client";
import { Resend } from "resend";

import { prisma } from "@/lib/db";

export type DeadlineEmailResult = {
  dryRun: boolean;
  productionOverdue: number;
  clientDeliveryOverdue: number;
  sent: number;
  skipped: number;
};

function notifyRecipient(): string | null {
  const explicit = process.env.OVERDUE_NOTIFY_EMAIL?.trim();
  if (explicit) {
    return explicit;
  }
  const allowlist = process.env.ALLOWED_EMAILS?.split(",")[0]?.trim();
  return allowlist || null;
}

/** Production + client delivery deadline alerts; idempotent per (lpo, type, dueAt). */
export async function processDeadlineEmails(
  now = new Date(),
): Promise<DeadlineEmailResult> {
  const recipient = notifyRecipient();
  if (!recipient) {
    throw new Error("No OVERDUE_NOTIFY_EMAIL or ALLOWED_EMAILS configured.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const dryRun = !apiKey;
  const resend = apiKey ? new Resend(apiKey) : null;
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "Ditanik <onboarding@resend.dev>";

  let sent = 0;
  let skipped = 0;

  const productionCandidates = await prisma.lpo.findMany({
    where: {
      status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
      productionDeadlineAt: { lt: now },
    },
    select: {
      id: true,
      lpoNumber: true,
      nickname: true,
      productionDeadlineAt: true,
      manufacturer: { select: { name: true } },
    },
  });

  let productionOverdue = 0;
  for (const lpo of productionCandidates) {
    productionOverdue += 1;
    const already = await prisma.emailNotification.findUnique({
      where: {
        lpoId_type_dueAt: {
          lpoId: lpo.id,
          type: DeadlineEmailType.PRODUCTION_OVERDUE,
          dueAt: lpo.productionDeadlineAt,
        },
      },
    });
    if (already) {
      skipped += 1;
      continue;
    }

    const subject = `[Ditanik] Production deadline passed — LPO ${lpo.lpoNumber}`;
    const body = `LPO ${lpo.lpoNumber} (${lpo.nickname}) assigned to ${lpo.manufacturer?.name ?? "unknown"} has passed its production deadline (${lpo.productionDeadlineAt.toISOString()}).`;

    if (!dryRun && resend) {
      await resend.emails.send({
        from,
        to: recipient,
        subject,
        text: body,
      });
      sent += 1;
    }

    await prisma.emailNotification.create({
      data: {
        lpoId: lpo.id,
        type: DeadlineEmailType.PRODUCTION_OVERDUE,
        dueAt: lpo.productionDeadlineAt,
        recipient,
        dryRun,
      },
    });
  }

  const deliveryCandidates = await prisma.lpo.findMany({
    where: {
      status: LpoStatus.ASSIGNED_TO_MANUFACTURER,
      clientDeliveryAt: { lt: now },
    },
    select: {
      id: true,
      lpoNumber: true,
      nickname: true,
      clientDeliveryAt: true,
    },
  });

  let clientDeliveryOverdue = 0;
  for (const lpo of deliveryCandidates) {
    clientDeliveryOverdue += 1;
    const already = await prisma.emailNotification.findUnique({
      where: {
        lpoId_type_dueAt: {
          lpoId: lpo.id,
          type: DeadlineEmailType.CLIENT_DELIVERY_OVERDUE,
          dueAt: lpo.clientDeliveryAt,
        },
      },
    });
    if (already) {
      skipped += 1;
      continue;
    }

    const subject = `[Ditanik] Client delivery date passed — LPO ${lpo.lpoNumber}`;
    const body = `LPO ${lpo.lpoNumber} (${lpo.nickname}) has passed its client delivery date (${lpo.clientDeliveryAt.toISOString()}) and is not marked completed.`;

    if (!dryRun && resend) {
      await resend.emails.send({
        from,
        to: recipient,
        subject,
        text: body,
      });
      sent += 1;
    }

    await prisma.emailNotification.create({
      data: {
        lpoId: lpo.id,
        type: DeadlineEmailType.CLIENT_DELIVERY_OVERDUE,
        dueAt: lpo.clientDeliveryAt,
        recipient,
        dryRun,
      },
    });
  }

  return {
    dryRun,
    productionOverdue,
    clientDeliveryOverdue,
    sent: dryRun ? 0 : sent,
    skipped,
  };
}
