"use client";

import { useLanguage } from "@/context/LanguageContext";

interface Props {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export default function HomeSidebar({ open, setOpen }: Props) {
  const { copy } = useLanguage();
  const links = [
    { name: copy.sidebar.top, href: "#top" },
    { name: copy.sidebar.menu, href: "#menu" },
    { name: copy.sidebar.about, href: "#about" },
    { name: copy.sidebar.contact, href: "#contact" },
  ];

  return (
    <div className="hidden shrink-0 items-start gap-2 pt-10 lg:flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-red-800 bg-red-900 text-xl text-white shadow-md transition hover:scale-105"
        aria-label={open ? copy.sidebar.close : copy.sidebar.open}
        aria-expanded={open}
      >
        {open ? "‹" : "›"}
      </button>

      {open ? (
        <aside className="w-[260px]">
          <div className="rounded-2xl border border-neutral-800 bg-[#111111] p-4 shadow-md sm:p-5">
            <h3 className="mb-4 text-xl font-bold text-red-500">
              {copy.sidebar.title}
            </h3>

            <nav className="flex flex-col gap-3">
              {links.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="cursor-pointer rounded-xl border border-neutral-800 bg-[#1a1a1a] px-4 py-3 font-semibold text-white transition hover:bg-red-600"
                >
                  {link.name}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
