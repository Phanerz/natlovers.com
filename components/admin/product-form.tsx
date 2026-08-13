"use client";

import {FormEvent, ReactNode} from "react";
import {
  accessoryCategories,
  accessoryCategoryLabels,
  bagMaterials,
  dollMaterials,
  genderLabels,
  handleLabels,
  materialLabels,
  productTypeLabels,
  shapeLabels,
  shopGenders,
  shopHandles,
  shopProductTypes,
  shopShapes,
  shopSizes,
  sizeLabels
} from "@/app/catalogue/shop-data";
import {ImageDropzone} from "./image-dropzone";
import {PillMultiSelect, PillSingleSelect} from "./pill-select";
import {ProductFormState} from "./types";

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

// Each Product Type owns its own attribute set — a Doll gets Gender + Size +
// Materials (from dollMaterials, which includes Mendong), an Accessory gets
// only Category, Apparel gets nothing beyond Basic Info/Images. No shared
// generic block that shows fields irrelevant to the selected type.
function AttributeFields({form, onChange}: {form: ProductFormState; onChange: (next: ProductFormState) => void}) {
  if (form.productType === "Bags") {
    return (
      <>
        <div className="grid gap-6 sm:grid-cols-2">
          <PillSingleSelect
            label="Size"
            options={shopSizes}
            getLabel={(option) => sizeLabels[option].en}
            value={form.size}
            onChange={(value) => onChange({...form, size: value})}
          />
          <PillSingleSelect
            label="Shape"
            options={shopShapes}
            getLabel={(option) => shapeLabels[option].en}
            value={form.shape}
            onChange={(value) => onChange({...form, shape: value})}
          />
          <PillSingleSelect
            label="Handle"
            options={shopHandles}
            getLabel={(option) => handleLabels[option].en}
            value={form.handle}
            onChange={(value) => onChange({...form, handle: value})}
          />
        </div>
        <PillMultiSelect
          label="Materials"
          options={bagMaterials}
          getLabel={(option) => materialLabels[option].en}
          value={form.materials}
          onChange={(value) => onChange({...form, materials: value})}
        />
      </>
    );
  }

  if (form.productType === "Dolls") {
    return (
      <>
        <div className="grid gap-6 sm:grid-cols-2">
          <PillSingleSelect
            label="Gender"
            options={shopGenders}
            getLabel={(option) => genderLabels[option].en}
            value={form.gender}
            onChange={(value) => onChange({...form, gender: value})}
          />
          <PillSingleSelect
            label="Size"
            options={shopSizes}
            getLabel={(option) => sizeLabels[option].en}
            value={form.size}
            onChange={(value) => onChange({...form, size: value})}
          />
        </div>
        <PillMultiSelect
          label="Materials"
          options={dollMaterials}
          getLabel={(option) => materialLabels[option].en}
          value={form.materials}
          onChange={(value) => onChange({...form, materials: value})}
        />
      </>
    );
  }

  if (form.productType === "Accessories") {
    return (
      <PillSingleSelect
        label="Category"
        options={accessoryCategories}
        getLabel={(option) => accessoryCategoryLabels[option].en}
        value={form.accessoryCategory}
        onChange={(value) => onChange({...form, accessoryCategory: value})}
      />
    );
  }

  return <p className="text-sm text-forest-500">Apparel has no additional attributes yet.</p>;
}

export function ProductForm({
  mode,
  form,
  onChange,
  onSubmit,
  submitting,
  uploadProgress,
  errorMessage,
  existingImages = [],
  onCancel
}: {
  mode: "create" | "edit";
  form: ProductFormState;
  onChange: (next: ProductFormState) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  uploadProgress: number | null;
  errorMessage: string | null;
  existingImages?: string[];
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <SectionCard step={1} title="Basic Info">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Name</span>
            <input
              value={form.name}
              onChange={(event) => onChange({...form, name: event.target.value})}
              required
              placeholder="Enter product name"
              className={fieldClass}
            />
          </label>

          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Price (IDR)</span>
            <input
              type="number"
              min={1}
              value={form.priceIdr}
              onChange={(event) => onChange({...form, priceIdr: event.target.value})}
              required
              placeholder="Enter price"
              className={fieldClass}
            />
          </label>

          <label className="space-y-2 text-sm text-forest-700 sm:col-span-2">
            <span className="muted">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => onChange({...form, description: event.target.value})}
              rows={4}
              placeholder="Enter product description..."
              className={fieldClass}
            />
          </label>
        </div>
      </SectionCard>

      <SectionCard step={2} title="Attributes">
        <PillSingleSelect
          label="Product Type"
          options={shopProductTypes}
          getLabel={(option) => productTypeLabels[option].en}
          value={form.productType}
          onChange={(value) => onChange({...form, productType: value})}
        />

        <AttributeFields form={form} onChange={onChange} />

        <label className="block space-y-2 text-sm text-forest-700">
          <span className="muted">Tags (comma separated)</span>
          <input
            value={form.tags}
            onChange={(event) => onChange({...form, tags: event.target.value})}
            placeholder="e.g. new, bestseller, limited"
            className={fieldClass}
          />
        </label>
      </SectionCard>

      <SectionCard step={3} title="Images">
        <ImageDropzone
          files={form.images}
          onFilesChange={(images) => onChange({...form, images})}
          existingImages={existingImages}
          uploadProgress={uploadProgress}
        />
      </SectionCard>

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="button-lift flex-1 rounded-full bg-forest-900 px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : mode === "create" ? "Save Product" : "Save changes"}
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
