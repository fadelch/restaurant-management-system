import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import NavBar from "@/components/nav_bar";
import Footer from "@/components/Footer";

export default async function AnnouncementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/announcements");

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

