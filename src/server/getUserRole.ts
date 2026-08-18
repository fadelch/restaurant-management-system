"use server";

import { getCurrentUser } from "@/lib/auth";

function isSuperAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;

  if (!superAdminEmail) {
    return false;
  }

  return email.toLowerCase() === superAdminEmail.toLowerCase();
}

export async function getUserRole(email: string) {
  try {
    void email;
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("User not found.");
    }

    const isSuperAdmin = isSuperAdminEmail(user.email);
    const isAdmin = user.isAdmin || isSuperAdmin;

    return {
      user,
      isAdmin,
      isSuperAdmin,
    };
  } catch (err) {
    console.log("Error getting user role:", err);
    throw err;
  }
}
