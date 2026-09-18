import * as Sentry from "@sentry/nextjs";

import { isDatabaseUnavailableError } from "@/lib/db-errors";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  beforeSend(event, hint) {
    if (isDatabaseUnavailableError(hint.originalException)) {
      return null;
    }
    return event;
  },
});