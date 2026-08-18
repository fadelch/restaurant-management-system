"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUsers } from "@/server/getUsers";
import { DeleteUsers } from "@/server/DeleteUsers";
import AdminLayout from "@/components/AdminLayout";
import UsersTable from "@/components/UsersTable";
import { showMessage } from "@/components/MessageProvider";
import { useConfirmDialog } from "@/components/ConfirmDialog";

export default function Page() {
  const { confirm: askConfirmation, dialog } = useConfirmDialog();
  const router = useRouter();

  useEffect(() => {
    const email = sessionStorage.getItem("Admin");

    if (!email) {
      router.push("/");
    }
  }, [router]);
  type User = {
    id: string;
    name: string | null;
    email: string | null;
    password?: string | null;
    confirm_password?: string | null;
    isAdmin: boolean;
    isBanned?: boolean;
    createdAt: string | Date;
    orders?: { id: string }[];
  };

  const [selectedId, setSelectedId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await getUsers();
        if (fetchedUsers) {
          console.log("Fetched users:", fetchedUsers);
          setUsers(fetchedUsers);
        }
      } catch (err) {
        console.log("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);
  const Delete_Users = async () => {
    if (!selectedId) {
      showMessage("Please select a user ID");
      return;
    }
    const confirmation = await askConfirmation(
      `Are you sure you want to delete the user with ID: ${selectedId}?`,
    );
    if (!confirmation) {
      return;
    }
    try {
      const deletedUser = await DeleteUsers(selectedId);
      console.log("Deleted user:", deletedUser);
      showMessage(`User with ID ${selectedId} has been deleted.`);
      window.location.reload();
      setSelectedId("");
    } catch (err) {
      console.log("Error deleting user:", err);
    }
  };

  return (
    <AdminLayout title="Delete Users">
      <UsersTable users={users} />

      <div className="flex flex-col">
        <select
          className="border-2 hover:cursor-pointer w-125 p-2 m-2 rounded-md"
          onChange={(e) => setSelectedId(e.target.value)}
          value={selectedId}
        >
          <option className="bg-red-500">Select Id</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} className="bg-red-500 ">
              {u.id}
            </option>
          ))}
        </select>

        <button
          className="border-2 w-full h-10 bg-red-600 text-white
        hover:bg-red-800 rounded-md mt-4 font-bold cursor-pointer"
          onClick={Delete_Users}
        >
          Delete
        </button>
      </div>
      {dialog}
    </AdminLayout>
  );
}
