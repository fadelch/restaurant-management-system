"use server";
import { deleteUser } from "@/server/deleteUser";

export async function DeleteUsers(id: string) {
  try {
    const deletedUser = await deleteUser({ requesterEmail: "", userId: id });
    if (deletedUser) {
      return deletedUser;
    } else {
      throw new Error("User not found");
    }
  } catch (err) {
    console.log("Error deleting user:", err);
    throw err;
  }
}
