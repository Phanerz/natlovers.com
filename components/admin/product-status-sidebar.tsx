"use client";

import {useState} from "react";
import {Pencil} from "lucide-react";
import {GlassToggle} from "./glass-toggle";
import {SelectField} from "./select-field";
import {AdminProduct, ProductFormState, ProductStatus, ProductVisibility} from "./types";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-3.5 py-2.5 text-sm text-forest-900 outline-none focus:border-forest-400 disabled:cursor-not-allowed disabled:opacity-50";

const statusOptions: {value: ProductStatus; label: string}[] = [
  {value: "active", label: "Active"},
  {value: "draft", label: "Draft"},
  {value: "archived", label: "Archived"}
];

const visibilityOptions: {value: ProductVisibility; label: string}[] = [
  {value: "public", label: "Public"},
  {value: "private", label: "Private"},
  {value: "hidden", label: "Hidden"}
];

function SidebarCard({title, action, children}: {title: string; action?: React.ReactNode; children: React.ReactNode}) {
  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-forest-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1.5 text-sm text-forest-700">
      <span className="muted">{label}</span>
      {children}
    </label>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not published yet";
  return new Date(iso).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
}

export function ProductStatusSidebar({
  form,
  onChange,
  product,
  productUrl
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState | ((prev: ProductFormState) => ProductFormState)) => void;
  // Undefined for a not-yet-created product  -  Published on/Last edited
  // read directly from it rather than the form, since both are set
  // automatically, never typed in.
  product?: AdminProduct;
  // Full canonical storefront URL, used only for the SEO preview  -  null
  // for a not-yet-created product (no slug exists until the first save).
  productUrl: string | null;
}) {
  const [editingSeo, setEditingSeo] = useState(false);
  const tracksInventory = form.stock.trim() !== "";

  const previewTitle = form.metaTitle.trim() || form.name.trim() || "Untitled product";
  const previewDescription =
    form.metaDescription.trim() || form.shortDescription.trim() || "No description provided yet.";

  return (
    <div className="space-y-6">
      <SidebarCard title="Product Status & Visibility">
        <Field label="Status">
          <SelectField value={form.status} onChange={(value) => onChange((prev) => ({...prev, status: value as ProductStatus}))}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </Field>

        <Field label="Visibility">
          <SelectField
            value={form.visibility}
            onChange={(value) => onChange((prev) => ({...prev, visibility: value as ProductVisibility}))}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </Field>

        <Field label="Published on">
          <p className="rounded-lg border border-[#d4c5ab] bg-[#f2ecdc] px-3.5 py-2.5 text-sm text-forest-600">
            {formatDate(product?.publishedAt)}
          </p>
        </Field>

        <Field label="Last edited">
          <p className="rounded-lg border border-[#d4c5ab] bg-[#f2ecdc] px-3.5 py-2.5 text-sm text-forest-600">
            {product ? formatDate(product.updatedAt) : "Not saved yet"}
          </p>
        </Field>
      </SidebarCard>

      <SidebarCard title="Inventory">
        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span className="text-sm font-medium text-forest-900">Track inventory</span>
          <GlassToggle
            checked={tracksInventory}
            onChange={(checked) => onChange((prev) => ({...prev, stock: checked ? "0" : ""}))}
            label="Track inventory"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock quantity">
            <input
              type="number"
              min={0}
              value={form.stock}
              disabled={!tracksInventory}
              onChange={(event) => onChange((prev) => ({...prev, stock: event.target.value}))}
              className={fieldClass}
            />
          </Field>
          <Field label="Low stock threshold">
            <input
              type="number"
              min={0}
              value={form.lowStockThreshold}
              disabled={!tracksInventory}
              onChange={(event) => onChange((prev) => ({...prev, lowStockThreshold: event.target.value}))}
              placeholder="Optional"
              className={fieldClass}
            />
          </Field>
        </div>
      </SidebarCard>

      <SidebarCard
        title="SEO Preview"
        action={
          <button
            type="button"
            onClick={() => setEditingSeo((open) => !open)}
            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit SEO
          </button>
        }
      >
        <p className="muted -mt-2">Search engine listing preview</p>
        <div className="rounded-lg border border-[#d4c5ab] bg-white p-3">
          <p className="truncate text-xs text-[#1a0dab]">{productUrl ?? "natlovers.com/catalogue/..."}</p>
          <p className="mt-0.5 truncate text-base text-[#1a0dab]">{previewTitle}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">{previewDescription}</p>
        </div>

        {editingSeo ? (
          <>
            <Field label="Meta title">
              <input
                value={form.metaTitle}
                onChange={(event) => onChange((prev) => ({...prev, metaTitle: event.target.value}))}
                placeholder={form.name || "Product name"}
                className={fieldClass}
              />
            </Field>
            <Field label="Meta description">
              <textarea
                value={form.metaDescription}
                onChange={(event) => onChange((prev) => ({...prev, metaDescription: event.target.value}))}
                rows={3}
                placeholder={form.shortDescription || "Short description"}
                className={fieldClass}
              />
            </Field>
          </>
        ) : null}
      </SidebarCard>
    </div>
  );
}
