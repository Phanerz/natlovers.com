"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {ArrowRight, Search, X} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {htmlToPlainText} from "@/lib/html-text";
import {unitPrice} from "@/lib/pricing";
import {CurrencyCode} from "@/lib/site";
import {useDialog} from "@/components/consent/use-dialog";

type SearchResult = {
  slug: string;
  title: string;
  description: string;
  priceIdr: number;
  priceUsdCents?: number | null;
  imageUrl: string;
};

const MAX_VISIBLE_RESULTS = 4;

// Search. Same ivory (light) and olive (dark) pop-up surface as the other dialogs (.pop-* in
// globals.css): flat, no blur, and the page behind does not scroll while it is open.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useDialog(entered, panelRef, onClose);
  // Typing should start at once, so the search field (not the close button) gets focus.
  useEffect(() => {
    if (!entered) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [entered]);

  // Portalled to <body>: the header this trigger lives in has a backdrop-filter, which becomes a
  // containing block for position:fixed descendants.
  return createPortal(
    <div data-scroll-lock onClick={onClose} className={`pop-overlay ${entered ? "is-in" : ""} ${!entered ? "pointer-events-none" : ""}`}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pop-search-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`pop-panel pop-panel--search ${entered ? "is-in" : ""}`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="pop-close">
          <X aria-hidden className="h-5 w-5" />
        </button>

        <p className="pop-eyebrow pop-eyebrow--plain">Search</p>
        <h2 id="pop-search-title" className="pop-title font-display">
          Find a Natlovers piece
        </h2>

        <label className="pop-searchbar">
          <Search aria-hidden className="h-4 w-4" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search motif, material, or story..."
            aria-label="Search the catalogue"
            autoComplete="off"
          />
        </label>

        {visible.length ? (
          <div className="pop-results">
            <div className="pop-results__head">
              <p className="pop-eyebrow pop-eyebrow--plain">Top matches</p>
              <Link href="/catalogue" onClick={onClose} className="pop-link">
                View all results <ArrowRight aria-hidden className="h-3 w-3" />
              </Link>
            </div>
            <ul className="pop-results__list">
              {visible.map((product) => (
                <li key={product.slug}>
                  <button type="button" onClick={() => onSelect(product.slug)} className="pop-result">
                    <span className="pop-result__thumb">
                      {product.imageUrl ? <Image src={product.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" /> : null}
                    </span>
                    <span className="pop-result__text">
                      <span className="pop-result__title font-display">{product.title}</span>
                      <span className="pop-result__desc">{htmlToPlainText(product.description)}</span>
                      <span className="pop-result__price">{formatCurrency(unitPrice(product, currency), currency)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="pop-empty">{query.trim() ? "No pieces match that search yet." : "Start typing to search the catalogue."}</p>
        )}

        <div className="pop-foot">
          <p>Can&rsquo;t find what you&rsquo;re looking for? Try different keywords or explore the full catalogue.</p>
          <Link href="/catalogue" onClick={onClose} className="pop-cta">
            Browse Catalogue <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
