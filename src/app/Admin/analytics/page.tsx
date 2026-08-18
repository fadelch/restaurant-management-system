import Nav_bar from "@/components/nav_bar";
import AdminDashboardStats from "@/components/AdminDashboardStats";
import { getAdminDashboardStats } from "@/server/getAdminDashboardStats";

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminDashboardStats();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Nav_bar />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <section className="mb-8 rounded-2xl border border-red-900/50 bg-[#1a0000] p-6 shadow-2xl sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-red-400">
            Admin only
          </p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black uppercase sm:text-4xl">
                Sales Analytics
              </h1>
              <p className="mt-2 text-gray-400">
                Revenue, orders, customer totals, stock warnings, and
                best-selling foods.
              </p>
            </div>
            <a
              href="/Admin"
              className="inline-flex cursor-pointer justify-center rounded-xl border border-red-900/60 bg-[#120000] px-5 py-3 font-black text-red-200 transition hover:border-red-500 hover:bg-[#240000]"
            >
              Back to Admin
            </a>
          </div>
        </section>

        <AdminDashboardStats data={analytics} />
      </main>
    </div>
  );
}
