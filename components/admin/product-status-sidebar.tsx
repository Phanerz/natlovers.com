"use client";

import {useState} from "react";
import {Pencil} from "lucide-react";
import {ChipInput} from "./chip-input";
import {BackorderPolicy, ProductFormState, ProductStatus, ProductVisibility} from "./types";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-3.5 py-2.5 text-sm text-forest-900 outline-none focus:border-forest-400";

const selectClass = `${fieldClass} appearance-none bg-[right_0.75rem_center] bg-no-repeat pr-9`;

const statusOptions: {value: ProductStatus; label: string}[] = [
  {value: "active", label: "Active"},
  {value: "draft", label: "Draft"},
  {value: "archived", label: "Archived"}
];

const visibilityOptions: {value: ProductVisibility; label: string; hint: string}[] = [
  {value: "public", label: "Public", hint: "Listed in the catalogue and reachable by direct link."},
  {value: "private", label: "Private", hint: "Reachable by direct link only, not listed."},
  {value: "hidden", label: "Hidden", hint: "Not reachable at all, same as deactivated."}
];

const backorderOptions: {value: BackorderPolicy; label: string}[] = [
  {value: "deny", label: "Do not allow"},
  {value: "allow", label: "Allow"}
];

function SidebarCard({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-display text-lg text-forest-900">{title}</h2>
      {children}
    </div>
  );
}

function Field({label, hint, children}: {label: string; hint?: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1.5 text-sm text-forest-700">
      <span className="muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-forest-500">{hint}</span> : null}
    </label>
  );
}

export function ProductStatusSidebar({
  form,
  onChange,
  productUrl
}: {
  form: ProductFormState;
  onChange: (next: ProductFormState | ((prev: ProductFormState) => ProductFormState)) => void;
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
          <select
            value={form.status}
            onChange={(event) => onChange((prev) => ({...prev, status: event.target.value as ProductStatus}))}
            className={selectClass}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Visibility" hint={visibilityOptions.find((option) => option.value === form.visibility)?.hint}>
          <select
            value={form.visibility}
            onChange={(event) => onChange((prev) => ({...prev, visibility: event.target.value as ProductVisibility}))}
            className={selectClass}
          >
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Published on">
          <input
            type="datetime-local"
            value={form.publishedAt}
            onChange={(event) => onChange((prev) => ({...prev, publishedAt: event.target.value}))}
            className={fieldClass}
          />
        </Field>
      </SidebarCard>

      <SidebarCard title="Inventory">
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3">
          <span>
            <span className="block text-sm font-medium text-forest-900">Track inventory</span>
            <span className="block text-xs text-forest-500">
              {tracksInventory ? "Stock quantity is enforced at checkout." : "Stock is not tracked for this product."}
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={tracksInventory}
            onClick={() => onChange((prev) => ({...prev, stock: tracksInventory ? "" : "0"}))}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ${
              tracksInventory ? "bg-forest-700" : "bg-[#d9cfc0]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-150 ${
                tracksInventory ? "translate-x-[1.375rem]" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>

        {tracksInventory ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stock quantity">
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(event) => onChange((prev) => ({...prev, stock: event.target.value}))}
                  className={fieldClass}
                />
              </Field>
              <Field label="Low stock threshold">
                <input
                  type="number"
                  min={0}
                  value={form.lowStockThreshold}
                  onChange={(event) => onChange((prev) => ({...prev, lowStockThreshold: event.target.value}))}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </Field>
            </div>

            <Field label="Allow backorders">
              <select
                value={form.allowBackorders}
                onChange={(event) => onChange((prev) => ({...prev, allowBackorders: event.target.value as BackorderPolicy}))}
                className={selectClass}
              >
                {backorderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}
      </SidebarCard>

      <SidebarCard title="Organisation">
        <Field label="Tags">
          <ChipInput
            values={form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)}
            onChange={(next) => onChange((prev) => ({...prev, tags: next.join(", ")}))}
            placeholder="Add a tag..."
          />
        </Field>

        <Field label="Vendor / Brand">
          <input
            value={form.vendor}
            onChange={(event) => onChange((prev) => ({...prev, vendor: event.target.value}))}
            placeholder="Natlovers"
            className={fieldClass}
          />
        </Field>

        <Field label="Collections">
          <ChipInput
            values={form.collections}
            onChange={(next) => onChange((prev) => ({...prev, collections: next}))}
            placeholder="Add a collection..."
          />
        </Field>
      </SidebarCard>

      <SidebarCard title="SEO Preview">
        <div className="rounded-lg border border-[#d4c5ab] bg-white p-3">
          <p className="truncate text-xs text-[#1a0dab]">{productUrl ?? "natlovers.com/catalogue/..."}</p>
          <p className="mt-0.5 truncate text-base text-[#1a0dab]">{previewTitle}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">{previewDescription}</p>
        </div>

        <button
          type="button"
          onClick={() => setEditingSeo((open) => !open)}
          className="flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          {editingSeo ? "Hide SEO fields" : "Edit SEO"}
        </button>

        {editingSeo ? (
          <>
            <Field label="Meta title" hint="Falls back to the product name when empty.">
              <input
                value={form.metaTitle}
                onChange={(event) => onChange((prev) => ({...prev, metaTitle: event.target.value}))}
                placeholder={form.name || "Product name"}
                className={fieldClass}
              />
            </Field>
            <Field label="Meta description" hint="Falls back to the short description when empty.">
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
