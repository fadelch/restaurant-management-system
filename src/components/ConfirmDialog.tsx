"use client";

import { useRef, useState } from "react";

export function useConfirmDialog() {
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  const confirm = (nextMessage: string) =>
    new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setMessage(nextMessage);
    });
  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setMessage(null);
  };
  const dialog = message ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-[#1a0000] p-6 shadow-2xl">
        <h2 id="confirm-title" className="text-xl font-black text-white">
          Confirm action
        </h2>
        <p className="mt-3 text-gray-300">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => answer(false)}
            className="cursor-pointer rounded-xl border border-white/20 px-5 py-2 font-bold text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="cursor-pointer rounded-xl bg-red-600 px-5 py-2 font-black text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { confirm, dialog };
}
