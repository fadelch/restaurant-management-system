"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputClass =
  "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

export default function ResetPasswordForm() {
  const [token, setToken] = useState("");
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.hash.slice(1));
    const resetToken = parameters.get("token") || "";
    setToken(resetToken);
    setTokenLoaded(true);
    if (!resetToken) {
      setError("This reset link is invalid or has expired. Request a new one.");
    }
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(result.message || "This reset link is invalid or has expired. Request a new one.");
        return;
      }
      setPassword("");
      setConfirmation("");
      setMessage(result.message || "Your password has been reset.");
    } catch {
      setError("This request cannot be completed right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#120000] px-4 py-10 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-3xl border border-red-900/50 bg-[#1a0000] p-6 shadow-2xl sm:p-8"
      >
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400">
          Account recovery
        </p>
        <h1 className="mt-3 text-3xl font-black">Choose a new password</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          Use at least eight characters with uppercase, lowercase, a number, and
          a special character.
        </p>
        {message ? (
          <p role="status" className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        {!message && tokenLoaded && token ? (
          <div className="mt-5 space-y-4">
            <input
              required
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className={inputClass}
            />
            <input
              required
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="Confirm new password"
              className={inputClass}
            />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-red-600 p-4 font-black transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </div>
        ) : null}
        <div className="mt-5 flex justify-center gap-4 text-sm font-bold">
          <Link href="/forgot-password" className="text-red-300 hover:underline">
            Request a new link
          </Link>
          <Link href="/login" className="text-gray-300 hover:underline">
            Back to login
          </Link>
        </div>
      </form>
    </main>
  );
}
