"use client";

import {FormEvent, ReactNode} from "react";
import {ImageDropzone} from "./image-dropzone";
import {TestimonialGroupFormState} from "./testimonial-types";

function SectionCard({step, title, children}: {step: number; title: string; children: ReactNode}) {
  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sand-200 text-sm font-semibold text-forest-900">
          {step}
        </span>
        <h2 className="font-display text-xl text-forest-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

export function TestimonialForm({
  mode,
  form,
  onChange,
  onSubmit,
  submitting,
  uploadProgress,
  errorMessage,
  existingBagImage,
  existingBagCustomerImage,
  onCancel
}: {
  mode: "create" | "edit";
  form: TestimonialGroupFormState;
  onChange: (next: TestimonialGroupFormState) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  uploadProgress: number | null;
  errorMessage: string | null;
  existingBagImage?: string | null;
  existingBagCustomerImage?: string | null;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <SectionCard step={1} title="Testimony">
        <div className="grid gap-5">
          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Customer name</span>
            <input
              value={form.customerName}
              onChange={(event) => onChange({...form, customerName: event.target.value})}
              required
              placeholder="Enter customer name"
              className={fieldClass}
            />
          </label>

          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Testimony text</span>
            <textarea
              value={form.testimonyText}
              onChange={(event) => onChange({...form, testimonyText: event.target.value})}
              required
              rows={4}
              placeholder="Enter the customer's testimony..."
              className={fieldClass}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard step={2} title="Bag image">
        <ImageDropzone
          files={form.bagImage}
          onFilesChange={(files) => onChange({...form, bagImage: files.slice(-1)})}
          existingImages={existingBagImage ? [existingBagImage] : []}
          uploadProgress={uploadProgress}
        />
      </SectionCard>

      <SectionCard step={3} title="Bag + customer photo">
        <ImageDropzone
          files={form.bagCustomerImage}
          onFilesChange={(files) => onChange({...form, bagCustomerImage: files.slice(-1)})}
          existingImages={existingBagCustomerImage ? [existingBagCustomerImage] : []}
          uploadProgress={null}
        />
      </SectionCard>

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="button-lift flex-1 rounded-full bg-forest-900 px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : mode === "create" ? "Save Testimonial" : "Save changes"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-6 py-4 text-base font-medium text-forest-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
