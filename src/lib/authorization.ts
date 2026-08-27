type AdminPrincipal = {
  hasAdminAccess: boolean;
  isSuperAdmin: boolean;
};

export function assertAdminAccess(user: AdminPrincipal) {
  if (!user.hasAdminAccess) throw new Error("Admin access is required.");
}

export function assertSuperAdminAccess(user: AdminPrincipal) {
  assertAdminAccess(user);
  if (!user.isSuperAdmin) throw new Error("Super Admin access is required.");
}
