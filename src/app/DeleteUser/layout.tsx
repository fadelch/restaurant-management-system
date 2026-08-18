import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function DeleteUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) redirect("/login");
  return children;
}
