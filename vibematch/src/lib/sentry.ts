import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.2,
    // Do not send PII
    beforeSend(event) {
      if (event.user) delete event.user.email;
      return event;
    },
  });
}

export { Sentry };
