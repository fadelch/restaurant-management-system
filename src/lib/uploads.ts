import "server-only";

import { unlink } from "node:fs/promises";
import path from "node:path";

export async function deleteUploadedFoodImage(image?: string | null) {
  if (!image?.startsWith("/uploads/foods/")) return;
  const uploadDirectory = path.join(
    process.cwd(),
    "public",
    "uploads",
    "foods",
  );
  const filePath = path.join(uploadDirectory, path.basename(image));

  try {
    await unlink(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error("Failed to delete food image:", error);
  }
}
