import { notFound } from "next/navigation";
import Nav_bar from "@/components/nav_bar";
import FoodCustomizer from "@/components/FoodCustomizer";
import { getFoodById } from "@/server/getFoodById";

export default async function FoodDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const food = await getFoodById(id);
  if (!food) notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />
      <FoodCustomizer food={food} />
    </div>
  );
}
