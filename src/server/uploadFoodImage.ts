"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { requireAdmin } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rateLimit";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function matchesSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }
  if (type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

export async function uploadFoodImage(formData: FormData) {
  const admin = await requireAdmin();
  await enforceRateLimit({
    policy: "image-upload-admin",
    identifier: admin.id,
    failurePolicy: "closed",
  });
  const file = formData.get("image");

  if (!(file instanceof File)) throw new Error("Choose an image file.");
  if (file.size <= 0) throw new Error("The selected image is empty.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Image must be 5 MB or smaller.");

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension)
    throw new Error("Only JPG, PNG, and WebP images are allowed.");

  const filename = `${randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!matchesSignature(file.type, bytes)) {
    throw new Error("The uploaded file content does not match its image type.");
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("Production image storage is not configured.");
    }
    const blob = await put(`foods/${filename}`, Buffer.from(bytes), {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 31_536_000,
    });
    return { path: blob.url };
  }

  const directory = path.join(process.cwd(), "public", "uploads", "foods");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);

  return { path: `/uploads/foods/${filename}` };
}
