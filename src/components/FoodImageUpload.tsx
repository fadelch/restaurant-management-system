"use client";

import { useState } from "react";
import { showMessage } from "@/components/MessageProvider";
import { uploadFoodImage } from "@/server/uploadFoodImage";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

async function compressImage(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Invalid image file."));
    element.src = dataUrl;
  });
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) =>
        result
          ? resolve(result)
          : reject(new Error("Image compression failed.")),
      "image/webp",
      0.82,
    ),
  );
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
  });
}

export default function FoodImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (path: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  const selectFile = async (file?: File) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showMessage("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showMessage("Image must be 5 MB or smaller.");
      return;
    }

    try {
      setUploading(true);
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("image", compressed);
      const result = await uploadFoodImage(formData);
      onChange(result.path);
      showMessage("Image uploaded successfully.");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-dashed border-red-900/60 bg-black/20 p-4">
      <label className="block text-sm font-bold text-gray-300">
        Food Image
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={uploading}
        onChange={(event) => selectFile(event.target.files?.[0])}
        className="mt-3 block w-full rounded-xl border border-white/10 bg-black p-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-bold file:text-white"
      />
      <p className="mt-2 text-xs text-gray-500">
        JPG, PNG, or WebP. Maximum 5 MB. Large images are compressed
        automatically.
      </p>

      {uploading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-neutral-800" />
      ) : value ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <img
            src={value}
            alt="Food preview"
            className="h-40 w-full rounded-xl object-cover sm:w-56"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-xl border border-red-500/30 px-4 py-2 font-bold text-red-300 hover:bg-red-950"
          >
            Remove Image
          </button>
        </div>
      ) : null}
    </div>
  );
}
