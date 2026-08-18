"use client";

const links = [
  { name: "Top", href: "#top" },
  { name: "Menu", href: "#menu" },
  { name: "About Us", href: "#about" },
  { name: "Contact Us", href: "#contact" },
];

interface Props {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export default function HomeSidebar({ open, setOpen }: Props) {
  return (
    <div className="flex shrink-0 items-start gap-2 pt-8">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-red-800 bg-red-900 text-xl text-white shadow-md transition hover:scale-105"
        aria-label={open ? "Close quick menu" : "Open quick menu"}
        aria-expanded={open}
      >
        {open ? "‹" : "›"}
      </button>

      {open ? (
        <aside className="w-[260px]">
          <div className="rounded-2xl border border-neutral-800 bg-[#111111] p-4 shadow-md sm:p-5">
            <h3 className="mb-4 text-xl font-bold text-red-500">Quick Menu</h3>

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
