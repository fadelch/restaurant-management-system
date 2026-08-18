"use client";

import { useCallback, useEffect, useState } from "react";

type MessageVariant = "success" | "error" | "info";

type Message = {
  id: number;
  text: string;
  variant: MessageVariant;
};

const MESSAGE_EVENT = "restaurant:message";
let messageId = 0;

function inferVariant(text: string): MessageVariant {
  if (
    /success|completed|added|removed|updated|deleted|registered|logged in|login successful|banned|unbanned/i.test(
      text,
    )
  ) {
    return "success";
  }

  return "error";
}

export function showMessage(message: unknown, variant?: MessageVariant) {
  if (typeof window === "undefined") return;

  const text = String(message);
  window.dispatchEvent(
    new CustomEvent(MESSAGE_EVENT, {
      detail: { text, variant: variant ?? inferVariant(text) },
    }),
  );
}

export default function MessageProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [messages, setMessages] = useState<Message[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  useEffect(() => {
    const handleMessage = (event: Event) => {
      const { text, variant } = (
        event as CustomEvent<{
          text: string;
          variant: MessageVariant;
        }>
      ).detail;
      const id = ++messageId;

      setMessages((current) => [...current, { id, text, variant }]);

      window.setTimeout(() => dismiss(id), 4500);
    };

    window.addEventListener(MESSAGE_EVENT, handleMessage);
    return () => window.removeEventListener(MESSAGE_EVENT, handleMessage);
  }, [dismiss]);

  return (
    <>
      {children}
      <div
        aria-atomic="false"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-end gap-3 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm"
      >
        {messages.map((message) => {
          const isSuccess = message.variant === "success";
          const isInfo = message.variant === "info";

          return (
            <div
              className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 text-white shadow-2xl backdrop-blur-md ${
                isSuccess
                  ? "border-emerald-500/60 bg-emerald-950/95"
                  : isInfo
                    ? "border-sky-500/60 bg-sky-950/95"
                    : "border-red-500/60 bg-[#240000]/95"
              }`}
              key={message.id}
              role={message.variant === "error" ? "alert" : "status"}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                  isSuccess
                    ? "bg-emerald-500 text-emerald-950"
                    : isInfo
                      ? "bg-sky-500 text-sky-950"
                      : "bg-red-500 text-white"
                }`}
              >
                {isSuccess ? "✓" : isInfo ? "i" : "!"}
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold leading-6">
                {message.text}
              </p>
              <button
                aria-label="Dismiss message"
                className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
                onClick={() => dismiss(message.id)}
                type="button"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
