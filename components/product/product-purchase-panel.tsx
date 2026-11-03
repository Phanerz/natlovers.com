"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {Heart, Share2} from "lucide-react";
import {Toast, ToastState} from "@/components/admin/toast";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {formatCurrency} from "@/lib/format";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {LOCAL_CUSTOM_DRAFT_KEY, type LocalCustomDraft} from "@/lib/custom-studio";
import {defaultConfigForProduct} from "@/lib/product-customization";
import type {ProductSelection} from "@/lib/product-selection";
import type {AdminProduct} from "@/lib/admin-products";
import {ProductSpecsPanel} from "@/components/product/product-specs-panel";

// The colour/note selection is owned by ProductDetailView (the customiser sits
// in the details section below); this column only carries it to the bag.
export function ProductPurchasePanel({
  product,
  selection,
  hasCustomisation
}: {
  product: AdminProduct;
  selection?: ProductSelection;
  hasCustomisation: boolean;
}) {
  const router = useRouter();
  const {status} = useSession();
  const signedIn = status === "authenticated";
  const {currency, locale} = useSitePreferences();
  const {addToCart} = useStorefront();
  const {isWishlisted, toggle: toggleWishlist} = useWishlist();

  // Whether Custom Studio supports this product's type at all (Bags/Dolls/
  // Apparels  -  see lib/custom-studio.ts) decides whether "Customise This
  // Bag" shows. Custom Studio has its own shape/fixed-colour data model,
  // unrelated to this page's size/colour picks, so this is only used to
  // seed a sensible starting point for that separate flow, not read from
  // directly elsewhere on this page.
  const customStudioBase = useMemo(() => defaultConfigForProduct(product), [product]);

  const [addedNotice, setAddedNotice] = useState(false);
  const [customising, setCustomising] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const wishlisted = isWishlisted(product.slug);

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

  async function handleCustomiseThisBag() {
    if (!customStudioBase || customising) return;
    setCustomising(true);
    try {
      // defaultConfigForProduct already seeds shape/handle/materials and
      // this product's own Size tag (Custom Studio's config happens to
      // share that Small/Medium/Large vocabulary  -  see the comment there).
      // Base/handle colour have no equivalent in Custom Studio (its colour
      // is a fixed five-material enum, not a per-product hex swatch), so
      // they aren't part of this handoff.
      const config = customStudioBase;
      const draft: LocalCustomDraft = {productType: config.productType, config, notes: ""};
      try {
        window.localStorage.setItem(LOCAL_CUSTOM_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Private-browsing quota failure  -  the PUT below (when signed in) is
        // the more durable path anyway, so this alone isn't fatal.
      }

      if (signedIn) {
        await fetch("/api/custom-request", {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({configuration: config, notes: "", currency})
        }).catch(() => undefined);
      }

      router.push("/custom");
    } finally {
      setCustomising(false);
    }
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

  return (
    <div className="flex h-full flex-col">
      <p className="pdp-eyebrow">Handcrafted in Indonesia</p>
      <h1 className="pdp-title">{product.name}</h1>
      <p className="pdp-price">
        {formatCurrency(product.priceIdr, currency)}
        {product.compareAtPriceIdr && product.compareAtPriceIdr > product.priceIdr ? (
          <span className="pdp-price-was">{formatCurrency(product.compareAtPriceIdr, currency)}</span>
        ) : null}
      </p>

      {product.shortDescription ? <p className="pdp-lede">{product.shortDescription}</p> : null}

      <ProductSpecsPanel product={product} outOfStock={outOfStock} stockLabel={stockLabel} locale={locale} />

      {hasCustomisation ? (
        <a href="#customise" className="pdp-customise-link">
          Choose colours &amp; personalise
          <span aria-hidden>↓</span>
        </a>
      ) : null}

      <div className="mt-auto flex flex-col gap-3 border-t border-[color:var(--pdp-line)] pt-6">
        {customStudioBase ? (
          <button
            type="button"
            onClick={() => void handleCustomiseThisBag()}
            disabled={customising}
            className="liquid-glass-dark button-lift w-full rounded-full px-6 py-3.5 text-sm font-semibold text-sand-50 backdrop-blur-[14px] backdrop-saturate-[160%] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          >
            {customising ? "One moment..." : "Customise This Bag"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleAddToBag}
          disabled={outOfStock}
          className={
            customStudioBase
              ? "glass-btn-secondary w-full rounded-full px-6 py-3.5 text-sm font-semibold text-forest-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
              : "liquid-glass-dark button-lift w-full rounded-full px-6 py-3.5 text-sm font-semibold text-sand-50 backdrop-blur-[14px] backdrop-saturate-[160%] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          }
        >
          {outOfStock ? "Sold Out" : addedNotice ? "Added to Bag" : "Add to Bag"}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleWishlist(product.slug)}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={wishlisted}
          title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="glass-btn-secondary flex h-9 w-9 items-center justify-center rounded-full text-forest-700 transition-colors duration-200 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        >
          <Heart className={`h-4 w-4 transition-colors duration-200 ${wishlisted ? "fill-forest-900 text-forest-900" : "text-forest-500"}`} />
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

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
