"use client";

import Image from "next/image";
import {useRef, useState} from "react";
import {ArrowLeft, ArrowRight, GripVertical, Star, UploadCloud, X} from "lucide-react";
import {ACCEPTED_IMAGE_LABEL, MAX_IMAGE_MB} from "@/lib/upload-limits";

export const MAX_PRODUCT_IMAGES = 6;

// Each image is uploaded to Blob storage as soon as it's added (see
// app/api/admin/products/images/route.ts), so this component only ever
// manages a plain ordered list of URLs - array order is the real, saved
// display order (position 0 is the main image shown everywhere the product
// appears), not a separate "which is the cover" field to keep in sync.
export function ImageDropzone({
  images,
  onImagesChange,
  slug
}: {
  images: string[];
  onImagesChange: (images: string[]) => void;
  slug: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which tile is currently being dragged, for reordering via native HTML5
  // drag-and-drop  -  a real addition alongside the existing move-arrow
  // buttons (kept for keyboard/mobile access), not a replacement for them.
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const remaining = MAX_PRODUCT_IMAGES - images.length;

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onImagesChange(next);
  }

  async function addFiles(list: FileList | null) {
    if (!list || !list.length) {
      return;
    }
    const incoming = Array.from(list)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, Math.max(0, remaining));

    if (!incoming.length) {
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (const file of incoming) {
        const body = new FormData();
        body.set("file", file);
        body.set("slug", slug);
        const response = await fetch("/api/admin/products/images", {method: "POST", body});
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? `Could not upload "${file.name}".`);
        }
        uploaded.push(payload.url);
      }
      onImagesChange([...images, ...uploaded]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload image.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) {
      return;
    }
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onImagesChange(next);
  }

  function setAsMain(index: number) {
    if (index === 0) {
      return;
    }
    const next = [...images];
    const [picked] = next.splice(index, 1);
    next.unshift(picked);
    onImagesChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <span className="muted">Images</span>
        <span className="text-xs text-forest-500">
          {images.length} of {MAX_PRODUCT_IMAGES}
        </span>
      </div>

      {images.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {images.map((url, index) => (
            <div
              key={url}
              draggable
              onDragStart={() => setDraggingIndex(index)}
              onDragEnter={() => setDragOverIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (draggingIndex !== null) {
                  reorder(draggingIndex, index);
                }
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggingIndex(null);
                setDragOverIndex(null);
              }}
              className={`group relative aspect-square overflow-hidden rounded-xl border bg-[#f2ecdc] transition-[border-color,opacity] duration-150 ${
                dragOverIndex === index && draggingIndex !== null && draggingIndex !== index
                  ? "border-forest-500"
                  : "border-[#d9ccb3]"
              } ${draggingIndex === index ? "opacity-40" : ""}`}
            >
              <Image src={url} alt={`Product image ${index + 1}`} fill sizes="160px" className="object-cover" />

              <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/55 text-[10px] font-semibold text-white">
                  {index + 1}
                </span>
                {index === 0 ? (
                  <span className="flex items-center gap-1 rounded-full bg-forest-900 px-2 py-0.5 text-[10px] font-semibold text-sand-50">
                    <Star className="h-2.5 w-2.5 fill-sand-50" />
                    Main
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAsMain(index)}
                    className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                  >
                    Set as main
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeImage(index)}
                aria-label="Remove image"
                className="icon-button absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              <div className="absolute bottom-1.5 left-1.5 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label="Move earlier"
                  className="icon-button flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === images.length - 1}
                  aria-label="Move later"
                  className="icon-button flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                className="absolute bottom-1.5 right-1.5 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity duration-150 active:cursor-grabbing group-hover:opacity-100"
                aria-hidden
                title="Drag to reorder"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {remaining > 0 ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void addFiles(event.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
            dragOver ? "border-forest-500 bg-forest-50" : "border-[#d4c5ab] bg-[#fffdf9] hover:border-forest-300"
          }`}
        >
          <UploadCloud className="h-7 w-7 text-forest-500" />
          <p className="text-sm font-medium text-forest-800">
            {uploading ? "Uploading..." : "Drag and drop images here, or click to browse"}
          </p>
          <p className="text-xs text-forest-500">
            {ACCEPTED_IMAGE_LABEL} up to {MAX_IMAGE_MB}MB each, {remaining} more allowed
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      ) : (
        <p className="text-xs text-forest-500">Maximum of {MAX_PRODUCT_IMAGES} images reached. Remove one to add another.</p>
      )}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
