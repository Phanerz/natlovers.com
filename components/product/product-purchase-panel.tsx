"use client";

import {useState} from "react";
import {ArrowDown, Heart, Palette, Share2} from "lucide-react";
import {Toast, ToastState} from "@/components/admin/toast";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {formatCurrency} from "@/lib/format";
import {compareAtPrice, unitPrice} from "@/lib/pricing";
import {useSitePreferences} from "@/components/site-preferences-provider";
import type {ProductSelection} from "@/lib/product-selection";
import type {AdminProduct} from "@/lib/admin-products";
import {ProductSpecsPanel} from "@/components/product/product-specs-panel";
import {ProductAtelierNotes, useMonthFull} from "@/components/atelier/product-atelier-notes";

// The colour/note selection is owned by ProductDetailView (the customiser sits
// in the details section below); this column only carries it to the bag.
export function ProductPurchasePanel({
  product,
  selection,
  hasCustomisation,
  extra = 0
}: {
  product: AdminProduct;
  selection?: ProductSelection;
  hasCustomisation: boolean;
  // Options already added to the price, in the chosen currency.
  extra?: number;
}) {
  const {currency, locale} = useSitePreferences();
  const {addToCart} = useStorefront();
  const {isWishlisted, toggle: toggleWishlist} = useWishlist();

  const [addedNotice, setAddedNotice] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const wishlisted = isWishlisted(product.slug);

  const monthFull = useMonthFull(product);
  const outOfStock = product.soldOut || (product.stock !== null && product.stock <= 0);
  const stockLabel = product.soldOut
    ? "Sold out"
    : product.stock === null
      ? "Available to order"
      : product.stock <= 0
        ? "Out of stock"
        : `${product.stock} in stock`;

  function handleAddToBag() {
    addToCart(product.slug, 1, selection ?? null);
    setAddedNotice(true);
    window.setTimeout(() => setAddedNotice(false), 2500);
  }

  // Takes the shopper to the colours and personalisation card (or, failing that, the details).
  function scrollToCustomise() {
    const target = document.getElementById("customise") ?? document.getElementById("details");
    target?.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  }

  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({title: product.name, url});
      } catch {
        // User cancelled the native share sheet, nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast({type: "success", message: "Link copied to clipboard."});
    } catch {
      setToast({type: "error", message: "Could not copy the link."});
    }
  }

  const compareAt = compareAtPrice(product, currency);

  return (
    <div className="flex h-full flex-col">
      <h1 className="pdp-title">{product.name}</h1>
      <p className="pdp-price">
        {formatCurrency(unitPrice(product, currency) + extra, currency)}
        {extra > 0 ? <span className="pdp-price-extra">includes {formatCurrency(extra, currency)} of customisation</span> : null}
        {compareAt && compareAt > unitPrice(product, currency) ? (
          <span className="pdp-price-was">{formatCurrency(compareAt, currency)}</span>
        ) : null}
      </p>
      {product.shortDescription ? <p className="pdp-lede">{product.shortDescription}</p> : null}
      <ProductAtelierNotes product={product} />

      <ProductSpecsPanel product={product} outOfStock={outOfStock} stockLabel={stockLabel} locale={locale} />

      {hasCustomisation ? (
        <button type="button" className="pdp-personalise mt-4" onClick={scrollToCustomise}>
          <span className="pdp-personalise__icon" aria-hidden>
            <Palette className="h-5 w-5" />
          </span>
          <span className="pdp-personalise__text">
            <span className="pdp-personalise__title">Choose colours &amp; personalise</span>
            <span className="pdp-personalise__hint">
              {product.hasPersonalisation ? "Pick your colours, add a felted friend or leave us a note" : "Pick the colours you would like"}
            </span>
          </span>
          <ArrowDown className="pdp-personalise__arrow h-5 w-5" aria-hidden />
        </button>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="ml-auto flex items-center gap-4">
          <button
            type="button"
            onClick={() => toggleWishlist(product.slug)}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={wishlisted}
            title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
            className="pdp-heart glass-btn-secondary flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          >
            <Heart className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Share this product"
            className="flex items-center gap-2 text-sm text-forest-700 transition-colors duration-200 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          >
            <Share2 className="h-4 w-4 text-forest-500" />
            Share
          </button>
        </div>
      </div>

      {/* The one button: it sits at the foot of this column, level with the bottom of the main photo. */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleAddToBag}
          disabled={outOfStock || monthFull}
          className="liquid-glass-dark button-lift w-full rounded-full px-6 py-3 text-sm font-semibold text-sand-50 backdrop-blur-[14px] backdrop-saturate-[160%] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        >
          {outOfStock ? "Sold Out" : addedNotice ? "Added to Bag" : "Add to Bag"}
        </button>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
