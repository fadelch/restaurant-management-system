import "server-only";

import * as Sentry from "@sentry/nextjs";

type SafeContext = {
  operation: string;
  code?: string | null;
  requestHash?: string;
  attempt?: number;
};

export function captureOperationalError(error: unknown, context: SafeContext) {
  Sentry.withScope((scope) => {
    scope.setTag("operation", context.operation);
    if (context.code) scope.setTag("database.code", context.code);
    if (context.requestHash) {
      scope.setTag("checkout.request", context.requestHash.slice(0, 12));
    }
    if (context.attempt) scope.setExtra("attempt", context.attempt);
    Sentry.captureException(error);
  });
}

export function addOperationalBreadcrumb(
  message: string,
  data: Record<string, string | number | boolean> = {},
) {
  Sentry.addBreadcrumb({
    category: "restaurant.operation",
    level: "info",
    message,
    data,
  });
}

