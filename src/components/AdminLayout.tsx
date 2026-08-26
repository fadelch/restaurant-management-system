"use client";

import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";

interface AdminLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AdminLayout({ title, children }: AdminLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <main className="flex-1 px-3 pb-8 pt-8 sm:px-4 sm:pb-10 sm:pt-12 md:px-8 lg:pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl border border-neutral-800 bg-[#111111] p-4 shadow-xl sm:rounded-[2rem] sm:p-6 md:p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <span className="mb-4 inline-block rounded-full bg-red-950 px-4 py-2 font-semibold text-red-300">
                  Admin Panel
                </span>

                <h1 className="break-words text-3xl font-extrabold sm:text-4xl md:text-5xl">
                  {title}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => router.push("/Admin")}
                className="w-full cursor-pointer rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:scale-105 hover:bg-red-700 md:w-auto"
              >
                Go to Admin
              </button>
            </div>

            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
