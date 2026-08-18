"use server";

import { clearAuthSession, getCurrentUser } from "@/lib/auth";

export async function getCurrentSession() {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.hasAdminAccess,
    isSuperAdmin: user.isSuperAdmin,
  };
}

export async function logoutUser() {
  await clearAuthSession();
}
