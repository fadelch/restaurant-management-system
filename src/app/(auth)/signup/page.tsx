"use client";

import Image from "next/image";
import { signupUser } from "@/server/signupUser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showMessage } from "@/components/MessageProvider";

export default function Page() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setpas] = useState("");
  const [confirm_pas, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const router = useRouter();

  const inputClass =
    "w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-3.5 text-base text-white sm:p-4 placeholder:text-gray-500 caret-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-700/50 autofill:shadow-[inset_0_0_0px_1000px_#120000] autofill:[-webkit-text-fill-color:white]";

  const clearButtonClass =
    "mt-3 w-full rounded-xl border border-red-900/60 bg-[#120000]/80 p-3.5 font-black sm:p-4 text-red-200 shadow-lg shadow-red-950/30 transition hover:-translate-y-1 hover:border-red-500 hover:bg-[#240000] cursor-pointer";

  const clearFields = () => {
    setName("");
    setEmail("");
    setpas("");
    setConfirm("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirm_pas.trim()
    ) {
      setFormError("Please complete every field.");
      return;
    }

    if (password !== confirm_pas) {
      setFormError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setFormError(
        "Password must be at least 8 characters and include upper/lowercase, a number, and a special character.",
      );
      return;
    }

    try {
      setLoading(true);

      await signupUser({
        name,
        email,
        password,
        confirm_password: confirm_pas,
      });

      showMessage("User registered successfully!");
      clearFields();
      router.push("/login");
    } catch (err) {
      console.log("Error inserting user:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to register user. Email may already exist.";
      setFormError(message);
      showMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#120000] text-white">
      <div className="grid min-h-dvh grid-cols-1 overflow-x-hidden lg:grid-cols-2">
        <div className="relative hidden lg:block">
          <Image
            src="/Logo.png"
            alt="Logo"
            fill
            sizes="50vw"
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/20" />

          <div className="absolute left-10 right-10 top-6 rounded-2xl border border-red-950/70 bg-[#1a0000]/85 p-6 shadow-2xl backdrop-blur-md">
            <h1 className="text-4xl font-black uppercase tracking-wide text-red-300">
              Create Account
            </h1>

            <p className="mt-3 max-w-md text-sm text-red-100">
              Join us and start ordering your favorite meals.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
          <Image
            src="/n.jpg"
            alt="Background"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/70" />

          <form
            onSubmit={handleSubmit}
            autoComplete="off"
            className="relative w-full max-w-md rounded-3xl border border-red-900/50 bg-[#1a0000]/90 p-5 shadow-2xl backdrop-blur-md sm:p-8"
          >
            <div className="mb-6 text-center sm:mb-8">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-red-400 sm:tracking-[0.3em]">
                Register
              </p>

              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Join Us
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                Create your account in just a few seconds.
              </p>
            </div>

            <div className="space-y-4">
              {formError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-200"
                >
                  {formError}
                </p>
              ) : null}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="off"
                className={inputClass}
              />

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                autoComplete="off"
                className={inputClass}
              />

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setpas(e.target.value)}
                  placeholder="Password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-14`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xl"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirm_pas}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={`${inputClass} pr-14`}
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-xl"
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full cursor-pointer rounded-xl bg-red-600 p-3.5 font-black text-white shadow-lg shadow-red-900/40 transition hover:-translate-y-1 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:p-4"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={clearFields}
              className={clearButtonClass}
            >
              Clear Fields
            </button>

            <p className="mt-6 text-center text-sm text-gray-300">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-bold text-red-400 hover:underline"
              >
                Login
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
