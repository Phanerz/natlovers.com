"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {UploadCloud, X} from "lucide-react";

const MAX_IMAGE_MB = 8;

// Hero cards only ever carry a single image, bundled directly into that
// form's own multipart submission (see hero-card-types.ts) rather than
// uploaded eagerly like product images - a simpler, separate need from
// components/admin/image-dropzone.tsx's multi-image product manager.
export function HeroImageDropzone({
  files,
  onFilesChange,
  uploadProgress = null
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  uploadProgress?: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function addFiles(list: FileList | null) {
    if (!list || !list.length) {
      return;
    }
    const incoming = Array.from(list).filter((file) => file.type.startsWith("image/"));
    onFilesChange(incoming.slice(-1));
  }

  return (
    <div className="space-y-3">
      <span className="muted">Image</span>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
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
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors duration-150 ${
          dragOver ? "border-forest-500 bg-forest-50" : "border-[#d4c5ab] bg-[#fffdf9] hover:border-forest-300"
        }`}
      >
        <UploadCloud className="h-7 w-7 text-forest-500" />
        <p className="text-sm font-medium text-forest-800">Drag and drop an image here, or click to browse</p>
        <p className="text-xs text-forest-500">JPG, PNG up to {MAX_IMAGE_MB}MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {previews.length ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {previews.map((url, index) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-[#d9ccb3] bg-[#f2ecdc]">
              <Image src={url} alt={`Selected image ${index + 1}`} fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onFilesChange([]);
                }}
                aria-label="Remove image"
                className="icon-button absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {uploadProgress !== null ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-forest-600">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#e7ddc6]">
            <div
              className="h-full rounded-full bg-forest-700 transition-all duration-200"
              style={{width: `${uploadProgress}%`}}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
