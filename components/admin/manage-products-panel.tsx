"use client";

import Image from "next/image";
import {useMemo, useState} from "react";
import {Filter, Pencil, RotateCcw, Search, Trash2} from "lucide-react";
import {AdminProduct} from "./types";

const PAGE_SIZE = 8;
type StatusFilter = "all" | "active" | "inactive";

const statusFilterLabels: Record<StatusFilter, string> = {
  all: "All products",
  active: "Active only",
  inactive: "Inactive only"
};

export function ManageProductsPanel({
  products,
  loading,
  onEdit,
  onDeactivate,
  onActivate,
  busySlug
}: {
  products: AdminProduct[];
  loading: boolean;
  onEdit: (product: AdminProduct) => void;
  onDeactivate: (product: AdminProduct) => void;
  onActivate: (product: AdminProduct) => void;
  busySlug: string | null;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery = !term || product.name.toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? product.isActive : !product.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [products, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function updateStatusFilter(value: StatusFilter) {
    setStatusFilter(value);
    setFilterOpen(false);
    setPage(1);
  }

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Manage Products ({filtered.length})</h2>

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
            className={`icon-button flex h-11 w-11 items-center justify-center rounded-full border ${
              statusFilter !== "all" ? "border-forest-700 bg-forest-900 text-sand-50" : "border-[#d4c5ab] bg-[#fffdf9] text-forest-700"
            }`}
          >
            <Filter className="h-4 w-4" />
          </button>
          {filterOpen ? (
            <div className="absolute right-0 top-[3.25rem] z-20 w-44 space-y-1 rounded-2xl border border-[#d7cab2] bg-[#fffaf1] p-2 shadow-[0_18px_40px_rgba(28,25,18,0.18)]">
              {(Object.keys(statusFilterLabels) as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateStatusFilter(value)}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${
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

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading products...</p>
      ) : pageItems.length ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                  <th className="pb-3 pr-3">Product</th>
                  <th className="pb-3 pr-3">Price (IDR)</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((product) => (
                  <tr key={product.slug} className="border-t border-[#e7ddc6]">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#d9ccb3] bg-[#f2ecdc]">
                          {product.imageUrl ? (
                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                          ) : null}
                        </div>
                        <span className="font-display text-base text-forest-900">{product.name}</span>
                      </div>
                    </td>
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
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit(product)}
                          aria-label={`Edit ${product.name}`}
                          className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {product.isActive ? (
                          <button
                            type="button"
                            disabled={busySlug === product.slug}
                            onClick={() => onDeactivate(product)}
                            aria-label={`Deactivate ${product.name}`}
                            className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-red-600 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busySlug === product.slug}
                            onClick={() => onActivate(product)}
                            aria-label={`Reactivate ${product.name}`}
                            className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-50"
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
