"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-black p-6 text-white">
        <main className="max-w-md rounded-2xl border border-red-900 bg-[#180303] p-8 text-center">
          <h1 className="text-2xl font-black">Something went wrong</h1>
          <p className="mt-3 text-gray-300">
            The problem was recorded. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-xl bg-red-600 px-5 py-3 font-black"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

