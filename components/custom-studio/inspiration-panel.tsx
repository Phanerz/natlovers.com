"use client";

import Image from "next/image";
import {useRef, useState} from "react";
import {AlertCircle, Loader2, Plus, RotateCcw, UploadCloud, X} from "lucide-react";
import {ACCEPTED_IMAGE_LABEL, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB} from "@/lib/upload-limits";
import {MAX_NOTES} from "@/lib/custom-studio";
import type {CustomRequestImageView} from "@/lib/custom-requests";

// Steps 2 and 3 of the studio. They share one component because they share
// the same draft plumbing, but they render as separate panels under their
// own step numbers — `section` picks which half. Limits shown here come from
// lib/upload-limits.ts, the same constant the upload route enforces, so the
// copy under the dropzone cannot drift from what the server will accept.

type FailedUpload = {id: string; files: File[]; message: string};

export function InspirationPanel({
  section,
  images,
  onImagesChange,
  notes,
  onNotesChange,
  requestId,
  signedIn,
  onNeedsDraft
}: {
  section: "inspiration" | "details";
  images: CustomRequestImageView[];
  onImagesChange: (images: CustomRequestImageView[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  requestId: string | null;
  signedIn: boolean;
  // Creates the draft row on demand, so the very first upload has something
  // to attach to. Returns the id, or null if the draft could not be saved.
  onNeedsDraft: () => Promise<string | null>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState<FailedUpload | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);

  async function upload(files: File[]) {
    setFailed(null);
    setRejected(null);

    if (!signedIn) {
      setRejected("Sign in to upload inspiration photos.");
      return;
    }

    // Checked client-side too, so an oversized file is refused instantly
    // rather than after a slow upload the server would reject anyway.
    const tooLarge = files.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      setRejected(`"${tooLarge.name}" is larger than ${MAX_IMAGE_MB}MB.`);
      return;
    }

    const wrongType = files.find(
      (file) => !ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])
    );
    if (wrongType) {
      setRejected(`"${wrongType.name}" isn't a ${ACCEPTED_IMAGE_LABEL} image.`);
      return;
    }

    setUploading(true);

    try {
      const targetId = requestId ?? (await onNeedsDraft());
      if (!targetId) {
        setFailed({id: crypto.randomUUID(), files, message: "Couldn't save your design before uploading."});
        return;
      }

      const formData = new FormData();
      formData.set("requestId", targetId);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/custom-request/images", {method: "POST", body: formData});
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFailed({
          id: crypto.randomUUID(),
          files,
          message: typeof payload?.error === "string" ? payload.error : "Upload failed."
        });
        return;
      }

      // The server returns the full, ordered set rather than only the new
      // rows, so appending can never disagree with what is actually stored.
      onImagesChange(payload.images as CustomRequestImageView[]);
    } catch {
      setFailed({id: crypto.randomUUID(), files, message: "Upload failed. Check your connection."});
    } finally {
      setUploading(false);
    }
  }

  async function remove(image: CustomRequestImageView) {
    if (!requestId) {
      return;
    }
    // Optimistic: the photo disappears immediately and is restored if the
    // server disagrees, so removing feels instant without lying about state.
    const previous = images;
    onImagesChange(images.filter((item) => item.id !== image.id));

    const response = await fetch(
      `/api/custom-request/images?requestId=${encodeURIComponent(requestId)}&imageId=${encodeURIComponent(image.id)}`,
      {method: "DELETE"}
    );

    if (!response.ok) {
      onImagesChange(previous);
      setFailed({id: crypto.randomUUID(), files: [], message: "Couldn't remove that photo."});
    }
  }

  if (section === "details") {
    return (
      <div className="space-y-1.5">
        <textarea
          value={notes}
          maxLength={MAX_NOTES}
          rows={4}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Tell us anything you'd like us to know…"
          className="w-full resize-none rounded-xl border border-[#ddd5c4] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-forest-900 outline-none placeholder:text-forest-300 focus:border-forest-600"
        />
        <p className="text-right text-[10px] text-forest-400">
          {notes.length} / {MAX_NOTES}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(Array.from(event.dataTransfer.files));
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors duration-150 ${
          dragOver ? "border-forest-500 bg-forest-50" : "border-[#d4c5ab] bg-[#fffdf9] hover:border-forest-300"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-forest-500" />
        ) : (
          <UploadCloud className="h-5 w-5 text-forest-500" />
        )}
        <p className="text-[11.5px] font-medium text-forest-800">
          {uploading ? "Uploading…" : "Drop photos here or click to browse"}
        </p>
        <p className="text-[10px] text-forest-400">
          {ACCEPTED_IMAGE_LABEL} up to {MAX_IMAGE_MB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(event) => {
            void upload(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {rejected ? (
        <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#a4553c]">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          {rejected}
        </p>
      ) : null}

      {failed ? (
        <div className="flex items-start justify-between gap-2 rounded-lg border border-[#e6c4b6] bg-[#fdf1ec] px-2.5 py-1.5">
          <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#a4553c]">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
            {failed.message}
          </p>
          {failed.files.length ? (
            <button
              type="button"
              onClick={() => void upload(failed.files)}
              className="flex shrink-0 items-center gap-1 rounded-full border border-[#d9a992] px-2 py-0.5 text-[10px] font-medium text-[#a4553c]"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {images.length ? (
        <div className="grid grid-cols-5 gap-1.5">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-[#d9ccb3] bg-[#f2ecdc]"
            >
              <Image src={image.url} alt="Inspiration" fill sizes="64px" className="object-cover" />
              <button
                type="button"
                onClick={() => void remove(image)}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label="Add more photos"
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-[#d4c5ab] bg-[#fffdf9] text-forest-500 transition-colors hover:border-forest-400"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {!signedIn ? (
        <p className="text-[10.5px] leading-relaxed text-forest-500">
          You can design freely without an account. Signing in lets you attach photos and send the request.
        </p>
      ) : null}
    </div>
  );
}
