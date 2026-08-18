import InsertButton from "@/components/InsertButton";

interface SectionHeaderProps {
  title: string;
  insertHref: string;
}

export default function SectionHeader({
  title,
  insertHref,
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex w-full flex-col items-start justify-between gap-4 sm:flex-row">
      <h2 className="text-2xl font-black uppercase underline decoration-white underline-offset-4">
        {title}
      </h2>

      <InsertButton href={insertHref} />
    </div>
  );
}
