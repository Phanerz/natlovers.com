"use client";

import Image from "next/image";
import Link from "next/link";
import type {Route} from "next";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import {useEffect, useMemo, useState} from "react";
import {Eye, Filter, Pencil, RotateCcw, Search, Trash2} from "lucide-react";
import {ShopProductType, productTypeLabels, shopProductTypes} from "@/app/catalogue/shop-data";
import {AdminProduct} from "./types";

const PAGE_SIZE = 8;
type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | ShopProductType;

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "All products",
  active: "Active only",
  inactive: "Inactive only"
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString(undefined, {dateStyle: "medium"});
}

export function ManageProductsPanel({
  products,
  loading,
  onEdit,
  onDeactivate,
  onActivate,
  busySlug,
  onBulkDeactivate,
  onBulkActivate,
  onBulkDelete
}: {
  products: AdminProduct[];
  loading: boolean;
  onEdit: (product: AdminProduct) => void;
  onDeactivate: (product: AdminProduct) => void;
  onActivate: (product: AdminProduct) => void;
  busySlug: string | null;
  onBulkDeactivate: (slugs: string[]) => Promise<void>;
  onBulkActivate: (slugs: string[]) => Promise<void>;
  onBulkDelete: (slugs: string[]) => Promise<void>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL's `type` param is the single source of truth for which category
  // is selected  -  both the sidebar's category links (admin-sidebar.tsx) and
  // this panel's own pill row read and write the same param, so clicking
  // either one keeps the other in sync. Previously the pills only wrote to
  // local state, so clicking "Accessories" here never moved the sidebar's
  // active dot.
  const typeParam = searchParams.get("type");
  const typeFilter: TypeFilter = typeParam
    ? (shopProductTypes.find((type) => type.toLowerCase() === typeParam.toLowerCase()) ?? "all")
    : "all";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  const typeCounts = useMemo(() => {
    const counts = {} as Record<ShopProductType, number>;
    for (const type of shopProductTypes) counts[type] = 0;
    for (const product of products) counts[product.productType] += 1;
    return counts;
  }, [products]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !term || product.name.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? product.isActive : !product.isActive);
      const matchesType = typeFilter === "all" || product.productType === typeFilter;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [products, query, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Selection is scoped to what's visible on the current page  -  switching
  // page or filters starts fresh rather than silently carrying a selection
  // the admin can no longer see.
  useEffect(() => {
    setSelected(new Set());
  }, [currentPage, query, statusFilter, typeFilter]);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setFilterOpen(false);
    setPage(1);
  }

  function updateTypeFilter(value: TypeFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value.toLowerCase());
    }
    router.replace(`${pathname}?${params.toString()}` as Route, {scroll: false});
  }

  function toggleSelected(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((current) => (current.size === pageItems.length ? new Set() : new Set(pageItems.map((product) => product.slug))));
  }

  async function runBulk(handler: (slugs: string[]) => Promise<void>) {
    await handler([...selected]);
    setSelected(new Set());
  }

  const allOnPageSelected = pageItems.length > 0 && selected.size === pageItems.length;

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-forest-900">Manage Products</h2>
        <div className="text-sm text-forest-600">{filtered.length} of {products.length}</div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateTypeFilter("all")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            typeFilter === "all" ? "bg-forest-900 text-sand-50" : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
          }`}
        >
          All Products
          <span className={typeFilter === "all" ? "text-sand-200" : "text-forest-500"}>{products.length}</span>
        </button>
        {shopProductTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateTypeFilter(type)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              typeFilter === type ? "bg-forest-900 text-sand-50" : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
            }`}
          >
            {productTypeLabels[type].en}
            <span className={typeFilter === type ? "text-sand-200" : "text-forest-500"}>{typeCounts[type]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
          <input
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Search products by name..."
            className="w-full rounded-full border border-[#d4c5ab] bg-[#fffdf9] py-3 pl-11 pr-4 text-sm text-forest-900 outline-none focus:border-forest-400"
          />
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            aria-label="Filter by status"
            className={`flex h-11 w-11 items-center justify-center rounded-full ${
              statusFilter !== "all" ? "glass-btn-primary text-sand-50" : "glass-icon-btn text-forest-700"
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
          {filterOpen ? (
            <div className="absolute right-0 top-[3.25rem] z-20 w-44 space-y-1 rounded-lg border border-[#d7cab2] bg-[#fffaf1] p-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              {(Object.keys(statusFilterLabels) as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateStatusFilter(value)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                    statusFilter === value ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-[#f0e7d4]"
                  }`}
                >
                  {statusFilterLabels[value]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-forest-700 bg-forest-900 px-5 py-3 text-sand-50">
          <span className="text-sm font-medium">
            {selected.size} product{selected.size === 1 ? "" : "s"} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runBulk(onBulkDeactivate)}
              className="button-lift rounded-full border border-sand-200/40 px-4 py-1.5 text-sm font-medium text-sand-50 hover:bg-white/10"
            >
              Hide Selected
            </button>
            <button
              type="button"
              onClick={() => runBulk(onBulkActivate)}
              className="button-lift rounded-full border border-sand-200/40 px-4 py-1.5 text-sm font-medium text-sand-50 hover:bg-white/10"
            >
              Unhide Selected
            </button>
            <button
              type="button"
              onClick={() => runBulk(onBulkDelete)}
              className="button-lift rounded-full border border-red-400/60 bg-red-500/20 px-4 py-1.5 text-sm font-medium text-red-100 hover:bg-red-500/30"
            >
              Delete Selected
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading products...</p>
      ) : pageItems.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                  <th className="w-8 pb-3 pr-3">
                    <input
                      type="checkbox"
                      aria-label="Select all products on this page"
                      checked={allOnPageSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 cursor-pointer rounded border border-[#c9bfa8] accent-forest-900"
                    />
                  </th>
                  <th className="pb-3 pr-3">Product</th>
                  <th className="pb-3 pr-3">Type</th>
                  <th className="pb-3 pr-3">Price (IDR)</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 pr-3">Visibility</th>
                  <th className="pb-3 pr-3">Stock</th>
                  <th className="pb-3 pr-3">Code</th>
                  <th className="pb-3 pr-3">Updated</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product) => (
                  <tr key={product.slug} className="border-t border-[#e7ddc6]">
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${product.name}`}
                        checked={selected.has(product.slug)}
                        onChange={() => toggleSelected(product.slug)}
                        className="h-4 w-4 cursor-pointer rounded border border-[#c9bfa8] accent-forest-900"
                      />
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#d9ccb3] bg-[#f2ecdc]">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                          ) : null}
                        </div>
                        <span className="font-display text-base text-forest-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-forest-700">{productTypeLabels[product.productType].en}</td>
                    <td className="py-3 pr-3 text-forest-700">Rp{product.priceIdr.toLocaleString("id-ID")}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          product.isActive ? "bg-[#dcead0] text-[#2f5b2b]" : "bg-[#f6ddc9] text-[#8a4a1f]"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-forest-600">
                        <Eye className="h-3.5 w-3.5" />
                        {product.isActive ? "Visible" : "Hidden"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-forest-700">{product.stock ?? <span className="text-forest-400">-</span>}</td>
                    <td className="py-3 pr-3 text-forest-700">{product.productCode ?? <span className="text-forest-400">-</span>}</td>
                    <td className="py-3 pr-3 whitespace-nowrap text-forest-600">{timeAgo(product.updatedAt)}</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/catalogue/${product.slug}`}
                          target="_blank"
                          aria-label={`Preview ${product.name}`}
                          className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          aria-label={`Edit ${product.name}`}
                          className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {product.isActive ? (
                          <button
                            type="button"
                            disabled={busySlug === product.slug}
                            onClick={() => onDeactivate(product)}
                            aria-label={`Deactivate ${product.name}`}
                            className="glass-icon-btn is-danger flex h-9 w-9 items-center justify-center rounded-full text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busySlug === product.slug}
                            onClick={() => onActivate(product)}
                            aria-label={`Reactivate ${product.name}`}
                            className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700 disabled:opacity-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="rounded-full border border-[#d4c5ab] px-4 py-2 text-sm text-forest-700 disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-forest-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                className="rounded-full border border-[#d4c5ab] px-4 py-2 text-sm text-forest-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No products match.</p>
      )}
    </div>
  );
}
