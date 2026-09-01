"use client";

import { useEffect, useId, useRef, useState } from "react";

type ConfirmDialogOptions = {
  message: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function useConfirmDialog() {
  const titleId = useId();
  const descriptionId = useId();
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  const confirm = (input: string | ConfirmDialogOptions) =>
    new Promise<boolean>((resolve) => {
      resolver.current?.(false);
      resolver.current = resolve;
      setOptions(typeof input === "string" ? { message: input } : input);
    });
  const answer = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  useEffect(() => {
    if (!options) return;
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") answer(false);
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [options]);

  useEffect(
    () => () => {
      resolver.current?.(false);
      resolver.current = null;
    },
    [],
  );

  const dialog = options ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-red-900/60 bg-[#1a0000] p-6 shadow-2xl">
        <h2 id={titleId} className="text-xl font-black text-white">
          {options.title || "Confirm action"}
        </h2>
        <p id={descriptionId} className="mt-3 text-gray-300">
          {options.message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => answer(false)}
            className="cursor-pointer rounded-xl border border-white/20 px-5 py-2 font-bold text-white hover:bg-white/10"
          >
            {options.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className="cursor-pointer rounded-xl bg-red-600 px-5 py-2 font-black text-white hover:bg-red-700"
          >
            {options.confirmLabel || "Yes"}
          </button>
        </div>
      </div>
    </div>
  ) : null;
  return { confirm, dialog };
}
