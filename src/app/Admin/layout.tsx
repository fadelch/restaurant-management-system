import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavBar from "@/components/nav_bar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.hasAdminAccess) redirect("/login");
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <NavBar />
      {children}
    </div>
  );
}
