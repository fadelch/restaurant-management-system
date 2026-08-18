"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/auth";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function uploadFoodImage(formData: FormData) {
  await requireAdmin();
  const file = formData.get("image");

  if (!(file instanceof File)) throw new Error("Choose an image file.");
  if (file.size <= 0) throw new Error("The selected image is empty.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Image must be 5 MB or smaller.");

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension)
    throw new Error("Only JPG, PNG, and WebP images are allowed.");

  const directory = path.join(process.cwd(), "public", "uploads", "foods");
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(
    path.join(directory, filename),
    Buffer.from(await file.arrayBuffer()),
  );

  return { path: `/uploads/foods/${filename}` };
}
