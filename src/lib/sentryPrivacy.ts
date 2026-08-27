import type { ErrorEvent } from "@sentry/nextjs";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

const SECRET_ENVIRONMENT_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "UPSTASH_REDIS_REST_TOKEN",
  "BLOB_READ_WRITE_TOKEN",
  "SENTRY_AUTH_TOKEN",
] as const;
const SENSITIVE_FIELD =
  /password|passphrase|authorization|cookie|token|secret|database[_-]?url|payment/i;

function redactKnownSecrets(value?: string) {
  if (!value) return value;
  return SECRET_ENVIRONMENT_KEYS.reduce((redacted, key) => {
    const secret = process.env[key];
    return secret && secret.length >= 8
      ? redacted.replaceAll(secret, "[Filtered]")
      : redacted;
  }, value);
}

function scrubRecord(value?: Record<string, unknown>) {
  if (!value) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_FIELD.test(key) ? "[Filtered]" : scrubValue(entry),
    ]),
  );
}

function scrubValue(value: unknown): unknown {
  if (typeof value === "string") return redactKnownSecrets(value);
  if (Array.isArray(value)) return value.map(scrubValue);
  if (value && typeof value === "object") {
    return scrubRecord(Object.fromEntries(Object.entries(value)));
  }
  return value;
}

export function scrubSentryEvent(event: ErrorEvent) {
  if (event.request) {
    event.request.data = undefined;
    event.request.cookies = undefined;
    event.request.query_string = undefined;
    event.request.env = undefined;
    event.request.url = event.request.url?.split(/[?#]/, 1)[0];
    if (event.request.headers) {
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(
          ([key]) => !SENSITIVE_HEADERS.has(key.toLowerCase()),
        ),
      );
    }
  }
  event.message = redactKnownSecrets(event.message);
  event.logentry = event.logentry
    ? {
        ...event.logentry,
        message: redactKnownSecrets(event.logentry.message),
      }
    : undefined;
  event.exception?.values?.forEach((exception) => {
    exception.value = redactKnownSecrets(exception.value);
  });
  event.extra = scrubRecord(event.extra);
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    message: redactKnownSecrets(breadcrumb.message),
    data: scrubRecord(breadcrumb.data),
  }));
  event.user = event.user?.id ? { id: event.user.id } : undefined;
  return event;
}

export function sentryEnvironment() {
  return (
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function sentryTraceSampleRate() {
  const configured = Number(process.env.SENTRY_TRACES_SAMPLE_RATE);
  if (Number.isFinite(configured) && configured >= 0 && configured <= 1) {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? 0.05 : 0;
}
