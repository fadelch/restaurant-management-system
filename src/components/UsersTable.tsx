"use client";

import { useCallback, useEffect, useState } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { updateUserAdminAccess } from "@/server/updateUserAdminAccess";
import { updateUserBan } from "@/server/updateUserBan";
import { deleteUser } from "@/server/deleteUser";
import type { User } from "@/types";
import { showMessage } from "@/components/MessageProvider";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import AdminPageControls from "@/components/AdminPageControls";
import { getUsersPage } from "@/server/adminData";

interface UsersTableProps {
  users?: User[];
  isSuperAdmin?: boolean;
}

const EMPTY_USERS: User[] = [];

export default function UsersTable({
  users = EMPTY_USERS,
  isSuperAdmin = false,
}: UsersTableProps) {
  const [localUsers, setLocalUsers] = useState<User[]>(users);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const { confirm: askConfirmation, dialog } = useConfirmDialog();
  const [query, setQuery] = useState<{
    page: number;
    pageSize: number;
    search: string;
    filter: string;
    sort: string;
    direction: "asc" | "desc";
  }>({
    page: 1,
    pageSize: 10,
    search: "",
    filter: "all",
    sort: "createdAt",
    direction: "desc",
  });
  const [pages, setPages] = useState(1);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState("");

  const loadUsers = useCallback(async () => {
    setTableLoading(true);
    setTableError("");
    try {
      const result = await getUsersPage(query);
      setLocalUsers(result.items as User[]);
      setPages(result.pages);
    } catch (err) {
      setTableError(
        err instanceof Error ? err.message : "Users could not be loaded.",
      );
    } finally {
      setTableLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const baseActionButton =
    "inline-flex min-w-[130px] cursor-pointer items-center justify-center rounded-xl px-4 py-2 text-sm font-black text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100";

  const makeAdminButton = `${baseActionButton} bg-green-700 shadow-green-950/40 hover:bg-green-800`;

  const removeAdminButton = `${baseActionButton} bg-red-600 shadow-red-950/40 hover:bg-red-700`;

  const banButton = `${baseActionButton} bg-yellow-600 shadow-yellow-950/40 hover:bg-yellow-700`;

  const unbanButton = `${baseActionButton} bg-emerald-700 shadow-emerald-950/40 hover:bg-emerald-800`;

  const deleteButton = `${baseActionButton} bg-red-800 shadow-red-950/50 hover:bg-red-900`;

  const protectedBadge =
    "inline-flex min-w-[130px] items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-300 shadow-lg shadow-purple-950/30";

  const noAccessBadge =
    "inline-flex min-w-[130px] items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-500";

  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  const superAdminEmail =
    typeof window !== "undefined" ? sessionStorage.getItem("SuperAdmin") : null;

  const handleAdminChange = async (user: User, makeAdmin: boolean) => {
    if (!superAdminEmail) {
      showMessage("Only the Super Admin can do this.");
      return;
    }

    const actionText = makeAdmin
      ? "give admin access to"
      : "remove admin access from";

    const confirmed = await askConfirmation(
      `Are you sure you want to ${actionText} ${user.email}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingUserId(user.id);

      await updateUserAdminAccess({
        requesterEmail: superAdminEmail,
        userId: user.id,
        makeAdmin,
      });

      setLocalUsers((prevUsers) =>
        prevUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isAdmin: makeAdmin,
              }
            : item,
        ),
      );

      showMessage(makeAdmin ? "Admin access added." : "Admin access removed.");
      await loadUsers();
    } catch (err) {
      console.log("Error updating admin access:", err);

      if (err instanceof Error) {
        showMessage(err.message);
      } else {
        showMessage("Failed to update admin access.");
      }
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleBanChange = async (user: User, ban: boolean) => {
    if (!superAdminEmail) {
      showMessage("Only the Super Admin can do this.");
      return;
    }

    const actionText = ban ? "ban" : "unban";

    const confirmed = await askConfirmation(
      `Are you sure you want to ${actionText} ${user.email}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingUserId(user.id);

      await updateUserBan({
        requesterEmail: superAdminEmail,
        userId: user.id,
        ban,
      });

      setLocalUsers((prevUsers) =>
        prevUsers.map((item) =>
          item.id === user.id
            ? {
                ...item,
                isBanned: ban,
              }
            : item,
        ),
      );

      showMessage(
        ban ? "User banned successfully." : "User unbanned successfully.",
      );
      await loadUsers();
    } catch (err) {
      console.log("Error updating ban:", err);

      if (err instanceof Error) {
        showMessage(err.message);
      } else {
        showMessage("Failed to update user ban.");
      }
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!superAdminEmail) {
      showMessage("Only the Super Admin can do this.");
      return;
    }

    const confirmed = await askConfirmation(
      `Are you sure you want to permanently delete ${user.email}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingUserId(user.id);

      await deleteUser({
        requesterEmail: superAdminEmail,
        userId: user.id,
      });

      setLocalUsers((prevUsers) =>
        prevUsers.filter((item) => item.id !== user.id),
      );

      showMessage("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      console.log("Error deleting user:", err);

      if (err instanceof Error) {
        showMessage(err.message);
      } else {
        showMessage("Failed to delete user.");
      }
    } finally {
      setLoadingUserId(null);
    }
  };

  return (
    <>
      <AnimatedSection variant="fade-up" delay={50}>
        <div className="rounded-2xl border border-red-900/40 bg-[#1a0000] p-5 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-2xl font-black uppercase underline decoration-white underline-offset-4">
              Users
            </h2>

            <p className="mt-6 text-sm text-gray-400">
              Manage users, admin permissions, bans, and account deletion.
            </p>

            {isSuperAdmin ? (
              <p className="mt-2 text-sm font-bold text-green-300">
                Super Admin mode enabled. You can give admin access, remove
                admin access, ban users, unban users, and delete users.
              </p>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Only the Super Admin can modify users.
              </p>
            )}
          </div>

          <AdminPageControls
            {...query}
            pages={pages}
            filters={[
              { value: "active", label: "Active" },
              { value: "admin", label: "Admins" },
              { value: "banned", label: "Banned" },
            ]}
            sorts={[
              { value: "createdAt", label: "Newest" },
              { value: "name", label: "Name" },
              { value: "email", label: "Email" },
            ]}
            onChange={(next) =>
              setQuery((current) => ({ ...current, ...next }))
            }
          />
          {tableError ? (
            <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-red-200">
              {tableError}
              <button
                type="button"
                onClick={loadUsers}
                className="ml-3 cursor-pointer rounded bg-red-600 px-3 py-1 font-bold"
              >
                Retry
              </button>
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-red-900/90 text-xs uppercase tracking-wider text-red-100">
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Name</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Role</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created At</th>
                  <th className="px-5 py-4 text-center">Admin Access</th>
                  <th className="px-5 py-4 text-center">Ban</th>
                  <th className="px-5 py-4 text-center">Delete</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10 bg-black/50">
                {tableLoading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-14">
                      <div className="h-12 animate-pulse rounded-xl bg-white/5" />
                    </td>
                  </tr>
                ) : localUsers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center">
                      <p className="text-lg font-bold text-white">
                        No users found
                      </p>

                      <p className="mt-2 text-sm text-gray-400">
                        If you already signed up, check your database
                        connection.
                      </p>
                    </td>
                  </tr>
                ) : (
                  localUsers.map((user) => {
                    const userIsSuperAdmin =
                      superAdminEmail &&
                      user.email?.toLowerCase() ===
                        superAdminEmail.toLowerCase();

                    const isLoading = loadingUserId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className={`transition hover:bg-red-950/30 ${
                          user.isBanned ? "bg-red-950/20" : ""
                        }`}
                      >
                        <td className="px-5 py-4 font-mono text-xs text-gray-400">
                          {user.id}
                        </td>

                        <td className="px-5 py-4 font-bold text-white">
                          {user.name || "-"}
                        </td>

                        <td className="px-5 py-4 text-gray-300">
                          {user.email || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {userIsSuperAdmin ? (
                            <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black uppercase text-purple-300">
                              Super Admin
                            </span>
                          ) : user.isAdmin ? (
                            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black uppercase text-green-300">
                              Admin
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-500/10 px-3 py-1 text-xs font-black uppercase text-gray-300">
                              User
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {user.isBanned ? (
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-black uppercase text-red-300">
                              Banned
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-black uppercase text-green-300">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-gray-300">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleString("en-GB")
                            : "-"}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {!isSuperAdmin ? (
                            <span className={noAccessBadge}>No access</span>
                          ) : userIsSuperAdmin ? (
                            <span className={protectedBadge}>Protected</span>
                          ) : user.isAdmin ? (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAdminChange(user, false)}
                              className={removeAdminButton}
                            >
                              {isLoading ? "Updating..." : "Remove Admin"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleAdminChange(user, true)}
                              className={makeAdminButton}
                            >
                              {isLoading ? "Updating..." : "Make Admin"}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {!isSuperAdmin ? (
                            <span className={noAccessBadge}>No access</span>
                          ) : userIsSuperAdmin ? (
                            <span className={protectedBadge}>Protected</span>
                          ) : user.isBanned ? (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleBanChange(user, false)}
                              className={unbanButton}
                            >
                              {isLoading ? "Updating..." : "Unban"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleBanChange(user, true)}
                              className={banButton}
                            >
                              {isLoading ? "Updating..." : "Ban"}
                            </button>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center">
                          {!isSuperAdmin ? (
                            <span className={noAccessBadge}>No access</span>
                          ) : userIsSuperAdmin ? (
                            <span className={protectedBadge}>Protected</span>
                          ) : (
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() => handleDeleteUser(user)}
                              className={deleteButton}
                            >
                              {isLoading ? "Deleting..." : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>
      {dialog}
    </>
  );
}
