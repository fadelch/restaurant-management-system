"use client";

export default function Footer() {
  return (
    <footer className="mt-10 w-full border-t border-neutral-800 bg-[#111111]">
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-4 py-5 sm:flex-row sm:px-6">
        <p className="text-center text-sm font-semibold text-red-600 sm:text-base">
          © {new Date().getFullYear()} Fadel Chaaban
        </p>

        <img
          src="/Logo.png"
          alt="logo"
          className="h-10 w-10 rounded-md object-cover opacity-90 sm:absolute sm:right-6 sm:h-12 sm:w-12"
        />
      </div>
    </footer>
  );
}
