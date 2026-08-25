"use client";

import {FormEvent} from "react";
import {ImageDropzone} from "./image-dropzone";
import {HeroCardFormState, HeroCardType} from "./hero-card-types";

const fieldClass =
  "w-full rounded-md border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

const TYPE_OPTIONS: {value: HeroCardType; label: string}[] = [
  {value: "image", label: "Image"},
  {value: "color", label: "Color swatch"}
];

export function HeroCardForm({
  form,
  onChange,
  onSubmit,
  submitting,
  uploadProgress,
  errorMessage
}: {
  form: HeroCardFormState;
  onChange: (next: HeroCardFormState) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  uploadProgress: number | null;
  errorMessage: string | null;
}) {
  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-6 sm:p-8">
      <div className="space-y-3">
        <span className="muted">Card type</span>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({...form, cardType: option.value})}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                form.cardType === option.value
                  ? "bg-forest-900 text-sand-50"
                  : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {form.cardType === "color" ? (
        <label className="space-y-2 text-sm text-forest-700">
          <span className="muted">Color</span>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.colorValue}
              onChange={(event) => onChange({...form, colorValue: event.target.value})}
              className="h-12 w-14 shrink-0 cursor-pointer rounded-lg border border-[#d4c5ab] bg-transparent p-1"
            />
            <input
              value={form.colorValue}
              onChange={(event) => onChange({...form, colorValue: event.target.value})}
              placeholder="#43AA8B"
              className={fieldClass}
            />
          </div>
        </label>
      ) : null}

      {form.cardType === "image" ? (
        <ImageDropzone
          files={form.image}
          onFilesChange={(files) => onChange({...form, image: files.slice(-1)})}
          uploadProgress={uploadProgress}
        />
      ) : null}

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="glass-btn-primary w-full rounded-full px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Add card"}
      </button>
    </form>
  );
}
