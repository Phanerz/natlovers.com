"use client";

import Link from "next/link";
import {FormEvent, ReactNode, useState} from "react";
import {ChevronLeft, ChevronRight, Copy, Eye, ExternalLink, RotateCcw, Trash2} from "lucide-react";
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
  shopShapes
} from "@/app/catalogue/shop-data";
import {GlassToggle} from "./glass-toggle";
import {ImageDropzone} from "./image-dropzone";
import {ProductOptionsCard} from "./product-options-card";
import {ProductStatusSidebar} from "./product-status-sidebar";
import {RichTextEditor} from "./rich-text-editor";
import {SelectField} from "./select-field";
import {PillMultiSelect, PillSingleSelect} from "./pill-select";
import {AdminProduct, PRODUCT_CODE_PREFIX, ProductFormState, ProductStatus} from "./types";

function SectionCard({title, action, children}: {title: string; action?: ReactNode; children: ReactNode}) {
  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-forest-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

function CharCount({value, max}: {value: string; max: number}) {
  return (
    <p className={`text-right text-xs ${value.length > max ? "text-red-600" : "text-forest-400"}`}>
      {value.length} / {max}
    </p>
  );
}

const statusPillStyle: Record<ProductStatus, string> = {
  active: "bg-[#dcecd8] text-[#2b5c2a]",
  draft: "bg-[#eee1c4] text-forest-800",
  archived: "bg-[#e6e0d8] text-forest-500"
};

const statusPillLabel: Record<ProductStatus, string> = {active: "Active", draft: "Draft", archived: "Archived"};

// Fixed physical/taxonomic properties that drive the catalogue's own filter
// sidebar (Shape, Handle type, Materials, Accessory sub-category)  -  distinct
// from Product Options (Size/Colour/Personalisation), which is what a
// customer actively chooses when buying. Size used to live here too; it
// moved to Product Options since it's a real purchase choice, not a fixed
// property of the listing. Returns null for types with nothing left to show
// (Dolls, Apparels) so the card itself can be skipped rather than rendered
// empty.
function AttributeFields({form, onChange}: {form: ProductFormState; onChange: (next: ProductFormState) => void}) {
  if (form.productType === "Bags") {
    return (
      <>
        <div className="grid gap-6 sm:grid-cols-2">
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

  if (form.productType === "Accessories") {
    return (
      <PillSingleSelect
        label="Accessory Category"
        options={accessoryCategories}
        getLabel={(option) => accessoryCategoryLabels[option].en}
        value={form.accessoryCategory}
        onChange={(value) => onChange({...form, accessoryCategory: value})}
      />
    );
  }

  return null;
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
  onDelete,
  onDuplicate,
  onNavigate,
  hasPrev,
  hasNext,
  onPreview,
  previewing
}: {
  mode: "create" | "edit";
  form: ProductFormState;
  // Also accepts an updater function (same shape as React's own
  // Dispatch<SetStateAction<...>>, which is what admin-dashboard.tsx passes
  // as setEditForm/setCreateForm)  -  several fields below need the latest
  // state read fresh rather than closing over a stale `form` snapshot from
  // whichever render scheduled the update.
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
  // Clones the current product into a new, unsaved create-mode draft.
  onDuplicate?: () => void;
  // Moves to the previous/next product in the current list order, staying
  // in the edit form.
  onNavigate?: (direction: -1 | 1) => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // Stages the current (possibly unsaved) form state as a draft and opens
  // /catalogue/[slug]?preview=1 in a new tab  -  edit-mode only, since a
  // create-mode product has no slug/URL yet.
  onPreview?: () => void;
  previewing?: boolean;
}) {
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const showAttributes = form.productType === "Bags" || form.productType === "Accessories";
  const productUrl = product ? `natlovers.com/catalogue/${product.slug}` : null;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <p className="text-xs text-forest-500">
          Dashboard <span aria-hidden>&gt;</span> Catalogue <span aria-hidden>&gt;</span> Products{" "}
          <span aria-hidden>&gt;</span> {mode === "create" ? "Add" : "Edit"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-forest-900">{mode === "create" ? "Add Product" : "Edit Product"}</h1>
            {mode === "edit" ? (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusPillStyle[form.status]}`}>
                {statusPillLabel[form.status]}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" && product ? (
              <Link
                href={`/catalogue/${product.slug}`}
                target="_blank"
                className="glass-btn-secondary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-forest-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View product
              </Link>
            ) : null}

            {mode === "edit" && onPreview ? (
              <button
                type="button"
                onClick={onPreview}
                disabled={previewing}
                title="Stage your unsaved edits and open them in a new tab, admin-only, not visible to customers"
                className="glass-btn-secondary flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-forest-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Eye className="h-3.5 w-3.5" />
                {previewing ? "Opening..." : "Preview"}
              </button>
            ) : null}

            {onDuplicate ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMoreActionsOpen((open) => !open)}
                  className="glass-btn-secondary rounded-full px-4 py-2.5 text-sm font-medium text-forest-700"
                >
                  More actions
                </button>
                {moreActionsOpen ? (
                  <div className="absolute right-0 top-full z-10 mt-2 w-52 rounded-lg border border-[#d9cfc0] bg-[#f7f4ee] py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        onDuplicate();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-forest-700 hover:bg-[#eee7d8]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate product
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {onNavigate ? (
              <div className="flex items-center overflow-hidden rounded-full border border-[#cdbfa6]">
                <button
                  type="button"
                  onClick={() => onNavigate(-1)}
                  disabled={!hasPrev}
                  aria-label="Previous product"
                  className="flex h-9 w-9 items-center justify-center text-forest-700 hover:bg-[#eee7d8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="h-5 w-px bg-[#cdbfa6]" />
                <button
                  type="button"
                  onClick={() => onNavigate(1)}
                  disabled={!hasNext}
                  aria-label="Next product"
                  className="flex h-9 w-9 items-center justify-center text-forest-700 hover:bg-[#eee7d8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="glass-btn-primary rounded-full px-6 py-2.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <SectionCard title="Basic Information">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-forest-700">
                <span className="muted">Product Name</span>
                <input
                  value={form.name}
                  onChange={(event) => onChange({...form, name: event.target.value})}
                  required
                  placeholder="Enter product name"
                  className={fieldClass}
                />
              </label>

              <label className="space-y-2 text-sm text-forest-700">
                <span className="muted">Slug</span>
                <input
                  value={product?.slug ?? "Generated automatically on save"}
                  readOnly
                  disabled
                  className={`${fieldClass} cursor-not-allowed text-forest-400`}
                />
              </label>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <label className="space-y-2 text-sm text-forest-700">
                <span className="muted">Category</span>
                <SelectField
                  value={form.productType}
                  onChange={(value) => onChange({...form, productType: value as ProductFormState["productType"]})}
                >
                  {shopProductTypes.map((option) => (
                    <option key={option} value={option}>
                      {productTypeLabels[option].en}
                    </option>
                  ))}
                </SelectField>
              </label>

              <label className="space-y-2 text-sm text-forest-700">
                <span className="muted">Collection</span>
                <input
                  value={form.collections[0] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    onChange((prev) => ({...prev, collections: value ? [value, ...prev.collections.slice(1)] : prev.collections.slice(1)}));
                  }}
                  placeholder="e.g. Spring Collection 2025"
                  className={fieldClass}
                />
              </label>

              <label className="space-y-2 text-sm text-forest-700">
                <span className="muted">SKU</span>
                <div className="flex items-center overflow-hidden rounded-lg border border-[#d4c5ab] bg-[#fffdf9] focus-within:border-forest-400">
                  <span className="pl-4 text-base text-forest-500">{PRODUCT_CODE_PREFIX}</span>
                  <input
                    value={form.productCodeSuffix}
                    onChange={(event) => onChange({...form, productCodeSuffix: event.target.value})}
                    placeholder="BAG007"
                    className="w-full min-w-0 bg-transparent py-3 pl-1 pr-4 text-base text-forest-900 outline-none"
                  />
                </div>
              </label>
            </div>

            <label className="block max-w-xs space-y-2 text-sm text-forest-700">
              <span className="muted">Price</span>
              <div className="flex items-center overflow-hidden rounded-lg border border-[#d4c5ab] bg-[#fffdf9] focus-within:border-forest-400">
                <span className="pl-4 text-base text-forest-500">Rp</span>
                <input
                  type="number"
                  min={1}
                  value={form.priceIdr}
                  onChange={(event) => onChange({...form, priceIdr: event.target.value})}
                  required
                  placeholder="Enter price"
                  className="w-full min-w-0 bg-transparent py-3 pl-1 pr-4 text-base text-forest-900 outline-none"
                />
              </div>
            </label>

            <label className="block space-y-2 text-sm text-forest-700">
              <span className="muted">Short Description (optional)</span>
              <textarea
                value={form.shortDescription}
                onChange={(event) => onChange({...form, shortDescription: event.target.value.slice(0, 160)})}
                rows={2}
                placeholder="A one-line summary shown near the price"
                className={fieldClass}
              />
              <CharCount value={form.shortDescription} max={160} />
            </label>

            <label className="block space-y-2 text-sm text-forest-700">
              <span className="muted">Product Description (optional)</span>
              <RichTextEditor
                value={form.description}
                onChange={(html) => onChange((prev) => ({...prev, description: html}))}
                placeholder="Enter product description..."
                maxLength={2000}
              />
            </label>
          </SectionCard>

          {showAttributes ? (
            <SectionCard title="Attributes">
              <AttributeFields form={form} onChange={onChange} />
            </SectionCard>
          ) : null}

          <SectionCard
            title="Product Images & Media"
            action={
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-forest-700">
                Enable image zoom
                <GlassToggle
                  checked={form.imageZoomEnabled}
                  onChange={(checked) => onChange((prev) => ({...prev, imageZoomEnabled: checked}))}
                  label="Enable image zoom"
                />
              </label>
            }
          >
            <p className="text-xs text-forest-500">Arrange images to set display order. Recommended size: 2000 x 2000px (1:1).</p>
            <ImageDropzone images={form.images} onImagesChange={(images) => onChange({...form, images})} slug={imageSlug} />
          </SectionCard>

          <SectionCard title="Product Options (Customisation)">
            <ProductOptionsCard form={form} onChange={onChange} />
          </SectionCard>

          {mode === "edit" && product ? (
            <SectionCard title="Danger Zone">
              <p className="text-sm text-forest-600">
                Same actions as the list view - hiding keeps the product's data and history, deleting removes it for good.
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
        </div>

        <ProductStatusSidebar form={form} onChange={onChange} product={product} productUrl={productUrl} />
      </div>
    </form>
  );
}
