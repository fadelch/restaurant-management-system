"use client";

import Link from "next/link";
import { useState } from "react";

const inputClass =
  "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-4 text-white outline-none transition placeholder:text-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-700/50";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as {
        message?: string;
      };
      if (!response.ok) {
        setError(result.message || "This request cannot be completed right now.");
        return;
      }
      setMessage(
        result.message ||
          "If an account exists for that email, a reset link has been sent.",
      );
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
        <h1 className="mt-3 text-3xl font-black">Forgot your password?</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          Enter your account email. For privacy, the response is the same whether
          or not an account exists.
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
        <label className="mt-5 block text-sm font-bold text-gray-300">
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </label>
        <button
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-red-600 p-4 font-black transition hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
        <Link href="/login" className="mt-5 block text-center text-sm font-bold text-red-300 hover:underline">
          Back to login
        </Link>
      </form>
    </main>
  );
}
