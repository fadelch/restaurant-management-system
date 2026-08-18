import { useRouter } from "next/navigation";

interface InsertButtonProps {
  href: string;
  label?: string;
}

export default function InsertButton({
  href,
  label = "Insert",
}: InsertButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-green-700 px-4 py-2 font-bold text-white transition-all hover:scale-95 hover:bg-green-800 sm:w-auto"
    >
      <span className="text-xl">＋</span>
      {label}
    </button>
  );
}
