import Nav_bar from "@/components/nav_bar";
import RestaurantOperationsManager from "@/components/RestaurantOperationsManager";

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 rounded-2xl border border-red-900/50 bg-[#1a0000] p-6">
          <h1 className="text-3xl font-black uppercase">
            Restaurant Operations
          </h1>
          <p className="mt-2 text-gray-400">
            Manage delivery zones, opening hours, discounts, and coupons.
          </p>
        </div>
        <RestaurantOperationsManager />
      </main>
    </div>
  );
}
