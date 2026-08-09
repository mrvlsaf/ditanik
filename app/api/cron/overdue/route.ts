import { NextResponse } from "next/server";

import { processDeadlineEmails } from "@/modules/notification/application/process-deadline-emails";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processDeadlineEmails();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Deadline email job failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
