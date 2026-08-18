import Nav_bar from "@/components/nav_bar";
import InventoryManager from "@/components/InventoryManager";

export default function InventoryPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <InventoryManager />
      </main>
    </div>
  );
}
