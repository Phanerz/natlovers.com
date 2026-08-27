"use client";

import {FormEvent, ReactNode} from "react";
import {Eye, RotateCcw, Trash2} from "lucide-react";
import {
  accessoryCategories,
  accessoryCategoryLabels,
  bagMaterials,
  handleLabels,
  materialLabels,
  productTypeLabels,
  shapeLabels,
  shopHandles,
  shopProductTypes,
  shopShapes,
  shopSizes,
  sizeLabels
} from "@/app/catalogue/shop-data";
import {ColourOptionsEditor} from "./colour-options-editor";
import {ImageDropzone} from "./image-dropzone";
import {PillMultiSelect, PillSingleSelect} from "./pill-select";
import {AdminProduct, PRODUCT_CODE_PREFIX, ProductFormState} from "./types";

function ToggleRow({
  label,
  hint,
  checked,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-forest-900">{label}</span>
        <span className="block text-xs text-forest-500">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${
          checked ? "bg-forest-700" : "bg-[#d9cfc0]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-150 ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

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
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

// Each Product Type owns its own attribute set  -  a Doll gets only Size, an
// Accessory gets only Category, Apparel gets nothing beyond Basic Info/
// Images. No shared generic block that shows fields irrelevant to the
// selected type.
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
      <PillSingleSelect
        label="Size"
        options={shopSizes}
        getLabel={(option) => sizeLabels[option].en}
        value={form.size}
        onChange={(value) => onChange({...form, size: value})}
      />
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
  errorMessage,
  imageSlug,
  onCancel,
  product,
  onDeactivate,
  onActivate,
  onDelete
}: {
  mode: "create" | "edit";
  form: ProductFormState;
  // Also accepts an updater function (same shape as React's own
  // Dispatch<SetStateAction<...>>, which is what admin-dashboard.tsx passes
  // as setEditForm/setCreateForm)  -  the Colours section's two toggles use
  // that form below so two fast, back-to-back field updates each read the
  // latest state instead of both closing over the same stale `form` snapshot
  // and one silently clobbering the other.
  onChange: (next: ProductFormState | ((prev: ProductFormState) => ProductFormState)) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  errorMessage: string | null;
  // Used only to name uploaded image blobs readably  -  doesn't need to be
  // the real, final slug (a create-mode product doesn't have one yet).
  imageSlug: string;
  onCancel?: () => void;
  // Edit-mode only  -  lets the form itself hide/unhide/delete the product
  // being edited, the same actions available from the list row.
  product?: AdminProduct;
  onDeactivate?: () => void;
  onActivate?: () => void;
  onDelete?: () => void;
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

          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Stock (optional)</span>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(event) => onChange({...form, stock: event.target.value})}
              placeholder="Leave blank if not tracked"
              className={fieldClass}
            />
          </label>

          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Product Code (optional)</span>
            <div className="flex items-center overflow-hidden rounded-lg border border-[#d4c5ab] bg-[#fffdf9] focus-within:border-forest-400">
              <span className="pl-4 text-base text-forest-500">{PRODUCT_CODE_PREFIX}</span>
              <input
                value={form.productCodeSuffix}
                onChange={(event) => onChange({...form, productCodeSuffix: event.target.value})}
                placeholder="BAG007"
                className="w-full bg-transparent py-3 pl-1 pr-4 text-base text-forest-900 outline-none"
              />
            </div>
          </label>

          <label className="space-y-2 text-sm text-forest-700">
            <span className="muted">Dimensions (optional)</span>
            <input
              value={form.dimensions}
              onChange={(event) => onChange({...form, dimensions: event.target.value})}
              placeholder="e.g. Approx. 30 x 20 x 15 cm"
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
          images={form.images}
          onImagesChange={(images) => onChange({...form, images})}
          slug={imageSlug}
        />
      </SectionCard>

      <SectionCard step={4} title="Colours">
        <p className="text-sm text-forest-600">
          Not every piece offers a colour choice. Turn these on only for products that genuinely do, and enter the real
          hex code for each option.
        </p>

        <ToggleRow
          label="Base colour"
          hint="Lets a customer pick the colour of the piece itself."
          checked={form.hasBaseColour}
          onChange={(checked) => onChange((prev) => ({...prev, hasBaseColour: checked}))}
        />
        {form.hasBaseColour ? (
          <ColourOptionsEditor
            label="Base colour"
            options={form.baseColourOptions}
            onChange={(baseColourOptions) => onChange((prev) => ({...prev, baseColourOptions}))}
          />
        ) : null}

        <ToggleRow
          label="Handle colour"
          hint="Lets a customer pick the colour of the handle or strap."
          checked={form.hasHandleColour}
          onChange={(checked) => onChange((prev) => ({...prev, hasHandleColour: checked}))}
        />
        {form.hasHandleColour ? (
          <ColourOptionsEditor
            label="Handle colour"
            options={form.handleColourOptions}
            onChange={(handleColourOptions) => onChange((prev) => ({...prev, handleColourOptions}))}
          />
        ) : null}
      </SectionCard>

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      {mode === "edit" && product ? (
        <SectionCard step={5} title="Danger Zone">
          <p className="text-sm text-forest-600">
            Same actions as the list view  -  hiding keeps the product's data and history, deleting removes it for good.
          </p>
          <div className="flex flex-wrap gap-3">
            {product.isActive ? (
              <button
                type="button"
                onClick={onDeactivate}
                className="glass-btn-secondary flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-forest-700"
              >
                <Eye className="h-4 w-4" />
                Hide from storefront
              </button>
            ) : (
              <button
                type="button"
                onClick={onActivate}
                className="glass-btn-secondary flex items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-forest-700"
              >
                <RotateCcw className="h-4 w-4" />
                Unhide
              </button>
            )}
            <button
              type="button"
              onClick={onDelete}
              className="button-lift flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 py-3 text-sm font-medium text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              Delete permanently
            </button>
          </div>
        </SectionCard>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="glass-btn-primary flex-1 rounded-full px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
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
