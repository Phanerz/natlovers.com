"use client";

import Image from "next/image";
import Link from "next/link";
import {createPortal} from "react-dom";
import {ArrowRight, Search, X} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {CurrencyCode} from "@/lib/site";

type SearchResult = {
  slug: string;
  title: string;
  description: string;
  priceIdr: number;
  imageUrl: string;
};

const MAX_VISIBLE_RESULTS = 4;

export function NavSearchModal({
  query,
  onQueryChange,
  results,
  currency,
  entered,
  onSelect,
  onClose
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: SearchResult[];
  currency: CurrencyCode;
  entered: boolean;
  onSelect: (slug: string) => void;
  onClose: () => void;
}) {
  const visible = results.slice(0, MAX_VISIBLE_RESULTS);

  // Portalled to <body>: the header this trigger lives in has backdrop-blur
  // (a backdrop-filter), which becomes a containing block for
  // position:fixed descendants, so "fixed inset-0" would otherwise resolve
  // against the header's own small box instead of the real viewport.
  return createPortal(
    <div
      data-scroll-lock
      onClick={onClose}
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/30 px-4 py-16 backdrop-blur-md transition-opacity duration-150 ${
        entered ? "opacity-100" : "opacity-0"
      } ${!entered ? "pointer-events-none" : ""}`}
    >
      <div className="mx-auto flex min-h-full max-w-xl items-center">
      <div
        onClick={(event) => event.stopPropagation()}
        className={`menu-surface w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#e4d9c1] bg-[rgba(250,246,236,0.98)] shadow-[0_30px_90px_rgba(18,20,14,0.24)] transition-all ${
          entered
            ? "translate-y-0 scale-100 opacity-100 duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            : "translate-y-4 scale-[0.88] opacity-0 duration-150 ease-out"
        }`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 sm:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-forest-500">Search</p>
            <h2 className="mt-1 font-display text-2xl text-forest-900">Find a Natlovers piece</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="icon-button rounded-full border border-[#e4d9c1] bg-white/70 p-2 text-forest-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-5 sm:px-8">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search motif, material, or story..."
              className="w-full rounded-full border border-[#e4d9c1] bg-white/70 py-3.5 pl-12 pr-5 text-sm text-forest-900 outline-none placeholder:text-forest-400"
            />
          </div>
        </div>

        {visible.length ? (
          <div className="mt-5 px-4 sm:px-5">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-500">Top Matches</p>
              <Link
                href="/catalogue"
                onClick={onClose}
                className="flex items-center gap-1 text-xs font-medium text-forest-600 hover:text-forest-900"
              >
                View all results <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {/*
              Same reasoning as the cart drawer's list: a rounded card
              sitting flush against a plain overflow:auto edge gets hard-
              clipped by the container's straight boundary the moment the
              list scrolls, reading as a broken/cut-off card rather than
              content that's simply scrolled past. The mask fades whichever
              row is nearest the edge out gracefully instead.
            */}
            <div
              className="max-h-[22rem] space-y-2 overflow-y-auto py-1 pb-2"
              style={{
                maskImage: "linear-gradient(to bottom, transparent, black 14px, black calc(100% - 14px), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, black 14px, black calc(100% - 14px), transparent)"
              }}
            >
              {visible.map((product) => (
                <button
                  key={product.slug}
                  type="button"
                  onClick={() => onSelect(product.slug)}
                  className="motion-card flex w-full items-center gap-4 rounded-2xl border border-[#e4d9c1] bg-white/70 p-3 text-left shadow-[0_6px_18px_rgba(59,43,22,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d5c8b1] hover:bg-white hover:shadow-[0_10px_26px_rgba(59,43,22,0.12)]"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e4d9c1] bg-[#eee4cd]">
                    {product.imageUrl ? (
                      <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-contain p-1" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base text-forest-900">{product.title}</p>
                    <p className="truncate text-xs text-forest-500">{product.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[#e4d9c1] bg-white px-3 py-1.5 text-xs font-semibold text-forest-800">
                    {formatCurrency(product.priceIdr, currency)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-forest-500 sm:px-8">
            {query.trim() ? "No pieces match that search yet." : "Start typing to search the catalogue."}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4d9c1] px-6 py-4 sm:px-8">
          <p className="text-xs text-forest-500">Can&rsquo;t find what you&rsquo;re looking for? Try different keywords or explore the full catalogue.</p>
          <Link
            href="/catalogue"
            onClick={onClose}
            className="glass-btn-primary flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-sand-50"
          >
            Browse Catalogue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
      </div>
    </div>,
    document.body
  );
}
