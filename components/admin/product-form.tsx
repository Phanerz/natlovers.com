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
  shopShapes,
  shopSizes,
  sizeLabels
} from "@/app/catalogue/shop-data";
import {summarizeBodyShapeDimensions} from "@/lib/body-shapes";
import {AdminBodyShape} from "./body-shape-types";
import {GlassToggle} from "./glass-toggle";
import {ImageDropzone} from "./image-dropzone";
import {ProductOptionsCard} from "./product-options-card";
import {ProductStatusSidebar} from "./product-status-sidebar";
import {RichTextEditor} from "./rich-text-editor";
import {SelectField} from "./select-field";
import {PillMultiSelect, PillOption, PillSingleSelect, pillClassName} from "./pill-select";
import {materialCodes, shapeCodes, sizeCodes, skuProblem, suggestDesignAbbreviation} from "@/lib/product-sku";
import {describeDimensions} from "@/lib/size-standard";
import {SkuField} from "./sku-field";
import {AdminProduct, ProductFormState, ProductStatus, bagSizeForForm, skuPartsFromForm} from "./types";

function SectionCard({
  title,
  description,
  action,
  children
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card space-y-6 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3 border-b border-[#eadfc9] pb-4">
        <div className="space-y-1">
          <h2 className="font-display text-xl text-forest-900">{title}</h2>
          {description ? <p className="text-xs text-forest-500">{description}</p> : null}
        </div>
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

// A body is required for a brand new Bag/Doll (enforced server-side in
// attributesForType), but an existing product migrated from the old
// Small/Medium/Large size system may still be unassigned  -  that option is
// only ever shown for a product that's already in that state, so a fresh
// create-mode form never lets an admin pick it back into "unassigned."
function BodyShapeField({
  bodyShapeId,
  bodyShapes,
  onChange
}: {
  bodyShapeId: string;
  bodyShapes: AdminBodyShape[];
  onChange: (value: string) => void;
}) {
  const active = bodyShapes.filter((shape) => !shape.isArchived || shape.id === bodyShapeId);

  if (!active.length) {
    return (
      <div className="rounded-lg border border-dashed border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-sm text-forest-500">
        No body shapes in the catalog yet.{" "}
        <Link href="/mimin?tab=add-body-shape" className="font-semibold text-forest-700 underline underline-offset-2">
          Add one
        </Link>{" "}
        before saving this product.
      </div>
    );
  }

  return (
    <label className="block">
      <span className="sr-only">Body</span>
      <SelectField value={bodyShapeId} onChange={onChange}>
        {!bodyShapeId ? <option value="">— Unassigned, pick a body —</option> : null}
        {active.map((shape) => (
          <option key={shape.id} value={shape.id}>
            {shape.name} · {summarizeBodyShapeDimensions(shape)}
            {shape.inStock ? "" : " · out of stock"}
            {shape.isArchived ? " · archived" : ""}
          </option>
        ))}
      </SelectField>
    </label>
  );
}

function DimensionsOverrideField({form, onChange}: {form: ProductFormState; onChange: (next: ProductFormState) => void}) {
  return (
    <input
      value={form.dimensions}
      onChange={(event) => onChange({...form, dimensions: event.target.value})}
      aria-label="Dimensions override (optional)"
      placeholder="e.g. Approx. 30 x 20 x 15 cm  -  for an irregular piece the assigned body's own dimensions can't express"
      className={fieldClass}
    />
  );
}

// A bag's size is calculated, not chosen: the NATLOVERS size standard reads
// the assigned body's dimensions (or the Dimensions Override when one is set)
// and classifies the finished bag. The admin sees the result and the numbers
// behind it; the only way to change it is an explicit, reasoned manual size,
// which is clearly marked and always shows the calculated size beside it.
function BagSizeField({
  form,
  onChange,
  bodyShapes,
  error
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState) => void;
  bodyShapes: AdminBodyShape[];
  error: string | null;
}) {
  const resolved = bagSizeForForm(form, bodyShapes);
  if (!resolved) return null;

  const body = bodyShapes.find((shape) => shape.id === form.bodyShapeId) ?? null;
  const source = resolved.basis === "override" ? "your Dimensions Override" : body ? body.name : null;
  const numbers =
    resolved.calculated && resolved.dimensions
      ? `${describeDimensions(resolved.dimensions)} · volume ${resolved.calculated.volumeCm3.toLocaleString("en-US")} cm³ · longest side ${resolved.calculated.longestSideCm} cm`
      : null;
  const manual = form.sizeOverride !== null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {resolved.size ? (
          <span className={pillClassName(true)}>{resolved.size}</span>
        ) : (
          <span className="rounded-lg border border-dashed border-[#c9b98f] bg-[#fbf3dd] px-3 py-2 text-sm font-medium text-[#8a6d2f]">
            Size unavailable — check body dimensions.
          </span>
        )}
        {resolved.size ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              manual ? "bg-[#f6ddc9] text-[#8a4a1f]" : "bg-[#e7efe3] text-[#3f5f3a]"
            }`}
          >
            {manual ? "Manual override" : "Automatically classified"}
          </span>
        ) : null}
      </div>

      {numbers && source ? (
        <p className="text-xs leading-relaxed text-forest-500">
          {manual ? "Calculated size" : "Based on"} {source}: {manual && resolved.calculated ? `${resolved.calculated.size} · ` : ""}
          {numbers}.{resolved.calculated?.promotedByLongestSide ? " Its longest side moves it up to Large." : ""}
        </p>
      ) : resolved.basis === "override" ? (
        <p className="text-xs text-forest-500">
          The Dimensions Override isn&apos;t in a form the size standard can read. Use three numbers such as 30 x 20 x 15 cm,
          or Ø24 x 10 cm for a round piece.
        </p>
      ) : null}

      {manual ? (
        // Theme-mapped surface and border, so the panel and its text stay readable in dark mode too.
        <div className="space-y-2 rounded-xl border border-[#d4c5ab] bg-[#eee7d8] p-3">
          <div className="flex flex-wrap gap-2">
            {shopSizes.map((option) => (
              <PillOption
                key={option}
                label={sizeLabels[option].en}
                code={sizeCodes[option]}
                active={form.sizeOverride === option}
                onClick={() => onChange({...form, sizeOverride: option})}
              />
            ))}
          </div>
          <input
            value={form.sizeOverrideReason}
            onChange={(event) => onChange({...form, sizeOverrideReason: event.target.value.slice(0, 300)})}
            placeholder="Why is this size set manually? (required)"
            aria-label="Reason for the manual size"
            className={fieldClass}
          />
          <button
            type="button"
            onClick={() => onChange({...form, sizeOverride: null, sizeOverrideReason: ""})}
            className="text-xs font-semibold text-forest-700 underline underline-offset-2 hover:text-forest-900"
          >
            Use the calculated size{resolved.calculated ? ` (${resolved.calculated.size})` : ""}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onChange({...form, sizeOverride: resolved.size ?? "Medium", sizeOverrideReason: ""})}
          className="text-xs font-semibold text-forest-700 underline underline-offset-2 hover:text-forest-900"
        >
          Set a manual size…
        </button>
      )}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

// Numbered options read in numeric order (1, 2, 3...), whatever order the
// storefront filter lists them in.
const materialsByCode = [...bagMaterials].sort((a, b) => Number(materialCodes[a]) - Number(materialCodes[b]));

// One attribute per row: the name (and a short hint on how to choose) on the
// left, the choices on the right, hairlines between rows. Stacks on narrow
// screens. Every attribute reads the same way, so the section scans top to
// bottom instead of being a mix of columns and wrapped pills.
function AttributeRow({label, hint, children}: {label: string; hint?: string; children: ReactNode}) {
  return (
    <div className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
      <div className="sm:pt-2">
        <span className="muted block">{label}</span>
        {hint ? <span className="mt-1 block text-xs text-forest-400">{hint}</span> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Fixed physical/taxonomic properties that drive the catalogue's own filter
// sidebar (Size, Shape, Handle type, Materials, Accessory sub-category) and
// the storefront's Dimensions accordion (Body)  -  distinct from Product
// Options (Colour/Personalisation), which is what a customer actively
// chooses when buying. Size is a coarse admin-assigned browsing tag, not
// tied to Body's real measurements  -  see the comment on products.size in
// lib/db/schema.ts. Returns null for types with nothing left to show
// (Apparels) so the card itself can be skipped rather than rendered empty.
function AttributeFields({
  form,
  onChange,
  bodyShapes,
  sizeError
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState) => void;
  bodyShapes: AdminBodyShape[];
  sizeError: string | null;
}) {
  const bodyRow = (
    <AttributeRow label="Body" hint="Sets the real dimensions">
      <BodyShapeField
        bodyShapeId={form.bodyShapeId}
        bodyShapes={bodyShapes}
        onChange={(value) => onChange({...form, bodyShapeId: value})}
      />
    </AttributeRow>
  );

  const sizeRow = (
    <AttributeRow label="Size" hint="Choose one">
      <PillSingleSelect
        bare
        label="Size"
        options={shopSizes}
        getLabel={(option) => sizeLabels[option].en}
        getCode={(option) => sizeCodes[option]}
        value={form.size}
        onChange={(value) => onChange({...form, size: value})}
      />
    </AttributeRow>
  );

  const dimensionsRow = (
    <AttributeRow label="Dimensions" hint="Optional override">
      <DimensionsOverrideField form={form} onChange={onChange} />
    </AttributeRow>
  );

  if (form.productType === "Bags") {
    return (
      <div className="divide-y divide-[#eadfc9]">
        {bodyRow}
        <AttributeRow label="Material" hint="Choose one">
          <PillSingleSelect
            bare
            label="Material"
            options={materialsByCode}
            getLabel={(option) => materialLabels[option].en}
            getCode={(option) => materialCodes[option]}
            value={form.materials[0] ?? null}
            onChange={(value) => onChange({...form, materials: [value]})}
          />
          {form.materials.length > 1 ? (
            <p className="mt-2 text-xs text-forest-500">
              This product has {form.materials.length} materials saved. Only one can be kept now, so picking one replaces
              the rest.
            </p>
          ) : null}
        </AttributeRow>
        <AttributeRow label="Shape" hint="Choose one">
          <PillSingleSelect
            bare
            label="Shape"
            options={shopShapes}
            getLabel={(option) => shapeLabels[option].en}
            getCode={(option) => shapeCodes[option]}
            value={form.shape}
            onChange={(value) => onChange({...form, shape: value})}
          />
        </AttributeRow>
        <AttributeRow label="Size" hint="Calculated from the body">
          <BagSizeField form={form} onChange={onChange} bodyShapes={bodyShapes} error={sizeError} />
        </AttributeRow>
        <AttributeRow label="Handle" hint="Choose any that apply">
          <PillMultiSelect
            bare
            label="Handle"
            options={shopHandles}
            getLabel={(option) => handleLabels[option].en}
            value={form.handles}
            onChange={(value) => onChange({...form, handles: value})}
          />
        </AttributeRow>
        {dimensionsRow}
      </div>
    );
  }

  if (form.productType === "Dolls") {
    return (
      <div className="divide-y divide-[#eadfc9]">
        {bodyRow}
        {sizeRow}
        {dimensionsRow}
      </div>
    );
  }

  if (form.productType === "Accessories") {
    return (
      <AttributeRow label="Category" hint="Choose one">
        <PillSingleSelect
          bare
          label="Accessory category"
          options={accessoryCategories}
          getLabel={(option) => accessoryCategoryLabels[option].en}
          value={form.accessoryCategory}
          onChange={(value) => onChange({...form, accessoryCategory: value})}
        />
      </AttributeRow>
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
  previewing,
  bodyShapes
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
  bodyShapes: AdminBodyShape[];
}) {
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const showAttributes =
    form.productType === "Bags" || form.productType === "Dolls" || form.productType === "Accessories";
  const productUrl = product ? `natlovers.com/catalogue/${product.slug}` : null;

  // A new product, or one that already has a code, can't be saved with the
  // generated SKU half-built; a legacy code is kept as-is and a code-less
  // existing product may stay code-less.
  function handleSubmit(event: FormEvent) {
    const needsSku = !form.skuLegacyCode && (mode === "create" || Boolean(product?.productCode));
    const problem = needsSku ? skuProblem(skuPartsFromForm(form, bodyShapes)) : null;
    setSkuError(problem);

    // A bag needs a size: a manual one must carry a reason, and a new bag whose
    // size can't be calculated can't be saved (an existing one keeps its size).
    const bag = bagSizeForForm(form, bodyShapes);
    let sizeProblem: string | null = null;
    if (bag && form.sizeOverride && !form.sizeOverrideReason.trim()) {
      sizeProblem = "Add a reason for the manual size.";
    } else if (bag && !bag.size && mode === "create") {
      sizeProblem = "Size unavailable — check body dimensions.";
    }
    setSizeError(sizeProblem);

    if (problem || sizeProblem) {
      event.preventDefault();
      return;
    }
    onSubmit(event);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
                  onChange={(event) => {
                    const name = event.target.value;
                    // Suggest a design abbreviation for a new product, but never
                    // overwrite one the admin has typed themselves.
                    onChange((prev) =>
                      mode === "create" && !prev.skuDesignTouched
                        ? {...prev, name, skuDesign: suggestDesignAbbreviation(name)}
                        : {...prev, name}
                    );
                  }}
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

            <div className="grid gap-5 sm:grid-cols-2">
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

            </div>

            <div className="space-y-2">
              <SkuField form={form} bodyShapes={bodyShapes} onChange={onChange} />
              {skuError ? <p className="text-sm font-medium text-red-600">{skuError}</p> : null}
            </div>

            {/* Two fixed prices, set by hand: nothing on the site is converted at an exchange rate. */}
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-sm text-forest-700">
                <span className="muted">Price in rupiah</span>
                <div className="flex items-center overflow-hidden rounded-lg border border-[#d4c5ab] bg-[#fffdf9] focus-within:border-forest-400">
                  <span className="pl-4 text-base text-forest-500">Rp</span>
                  <input
                    type="number"
                    min={1}
                    value={form.priceIdr}
                    onChange={(event) => onChange({...form, priceIdr: event.target.value})}
                    required
                    placeholder="2250000"
                    className="w-full min-w-0 bg-transparent py-3 pl-1 pr-4 text-base text-forest-900 outline-none"
                  />
                </div>
              </label>
              <label className="block space-y-2 text-sm text-forest-700">
                <span className="muted">Price in US dollars</span>
                <div className="flex items-center overflow-hidden rounded-lg border border-[#d4c5ab] bg-[#fffdf9] focus-within:border-forest-400">
                  <span className="pl-4 text-base text-forest-500">$</span>
                  <input
                    type="number"
                    min={1}
                    step="0.01"
                    value={form.priceUsd}
                    onChange={(event) => onChange({...form, priceUsd: event.target.value})}
                    required
                    placeholder="149"
                    className="w-full min-w-0 bg-transparent py-3 pl-1 pr-4 text-base text-forest-900 outline-none"
                  />
                </div>
              </label>
              <p className="text-xs text-forest-500 sm:col-span-2">
                Each currency has its own fixed price. Customers pay exactly the one they choose; nothing is converted.
              </p>
            </div>

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

            <fieldset className="space-y-3 rounded-xl border border-[#d4c5ab] p-4 text-sm text-forest-700">
              <legend className="px-1 text-xs uppercase tracking-[0.2em] text-forest-500">Atelier limits</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 sm:col-span-2">
                  <span className="muted">Fulfilment</span>
                  <select value={form.fulfilmentType} onChange={(event) => onChange({...form, fulfilmentType: event.target.value})} className={fieldClass}>
                    <option value="made_to_order">Made to order (counts towards the monthly cap)</option>
                    <option value="ready_to_ship">Ready to ship (finished stock, limited by its stock quantity)</option>
                  </select>
                </label>
                {form.fulfilmentType === "ready_to_ship" ? (
                  <label className="block space-y-1 sm:col-span-2">
                    <span className="muted">Dispatch note (optional)</span>
                    <input
                      type="text"
                      maxLength={160}
                      value={form.dispatchNote}
                      onChange={(event) => onChange({...form, dispatchNote: event.target.value})}
                      placeholder="For example: posted within two working days"
                      className={fieldClass}
                    />
                    <CharCount value={form.dispatchNote} max={160} />
                  </label>
                ) : null}
                <label className="block space-y-1">
                  <span className="muted">Limit group</span>
                  <select value={form.capGroup} onChange={(event) => onChange({...form, capGroup: event.target.value})} className={fieldClass}>
                    <option value="">Default for this type ({form.productType === "Dolls" || form.productType === "Accessories" ? "Atelier extras" : "Pieces"})</option>
                    <option value="PIECES">Pieces (counts towards the monthly cap)</option>
                    <option value="ATELIER_EXTRAS">Atelier extras</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="muted">Max per order</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.maxPerOrder}
                    onChange={(event) => onChange({...form, maxPerOrder: event.target.value})}
                    placeholder="The group limit"
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="muted">Lead time from (weeks)</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.leadTimeWeeksMin}
                    onChange={(event) => onChange({...form, leadTimeWeeksMin: event.target.value})}
                    disabled={form.fulfilmentType === "ready_to_ship"}
                    placeholder="Not shown"
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="muted">Lead time to (weeks)</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.leadTimeWeeksMax}
                    onChange={(event) => onChange({...form, leadTimeWeeksMax: event.target.value})}
                    disabled={form.fulfilmentType === "ready_to_ship"}
                    placeholder="Not shown"
                    className={fieldClass}
                  />
                </label>
              </div>
              <p className="text-xs text-forest-500">
                The lead time is shown to customers only when it is filled in. The per-order and monthly limits are set on the Atelier page.
                {form.fulfilmentType === "ready_to_ship"
                  ? " A ready to ship product is not counted towards the monthly cap, shows no lead time and cannot be ordered beyond its stock quantity, so fill in the stock under Inventory."
                  : ""}
              </p>
            </fieldset>

            {/* A div, not a <label>: a label forwards any click inside it (including the
                mouseup that ends a drag-selection) to its first labelable descendant,
                which here is the toolbar's Bold button. */}
            <div className="block space-y-2 text-sm text-forest-700">
              <span id="product-description-label" className="muted">
                Product Description (optional)
              </span>
              <RichTextEditor
                labelledBy="product-description-label"
                value={form.description}
                onChange={(html) => onChange((prev) => ({...prev, description: html}))}
                placeholder="Enter product description..."
                maxLength={2000}
              />
            </div>
          </SectionCard>

          {showAttributes ? (
            <SectionCard title="Attributes" description="Physical properties. Material, shape and size also build the SKU; handle does not.">
              <AttributeFields form={form} onChange={onChange} bodyShapes={bodyShapes} sizeError={sizeError} />
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
