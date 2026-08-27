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
import {ShopSize} from "@/app/catalogue/shop-data";
import {ProductCustomizer} from "@/components/product/product-customizer";

export function ProductPurchasePanel({product}: {product: AdminProduct}) {
  const router = useRouter();
  const {status} = useSession();
  const signedIn = status === "authenticated";
  const {currency} = useSitePreferences();
  const {addToCart} = useStorefront();
  const {isWishlisted, toggle: toggleWishlist} = useWishlist();

  const showSize = product.size !== null;
  const [size, setSize] = useState<ShopSize>(product.size ?? "Medium");
  const [baseColour, setBaseColour] = useState<string | null>(product.baseColourOptions[0]?.label ?? null);
  const [handleColour, setHandleColour] = useState<string | null>(product.handleColourOptions[0]?.label ?? null);

  const hasSelection = showSize || product.hasBaseColour || product.hasHandleColour;
  const selection: ProductSelection | undefined = hasSelection
    ? {
        kind: "productSelection",
        ...(showSize ? {size} : {}),
        ...(product.hasBaseColour && baseColour ? {baseColour} : {}),
        ...(product.hasHandleColour && handleColour ? {handleColour} : {})
      }
    : undefined;

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
      ? "Stock not tracked"
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
      // Size is the one axis that maps cleanly onto Custom Studio's own
      // config shape (same Small/Medium/Large domain for Bags and Dolls,
      // the only types that show a size picker here)  -  carried over so the
      // studio opens already reflecting what was chosen. Base/handle colour
      // have no equivalent there (Custom Studio's colour is a fixed
      // five-material enum, not a per-product hex swatch), so they aren't
      // part of this handoff.
      const config =
        showSize && (customStudioBase.productType === "Bags" || customStudioBase.productType === "Dolls")
          ? {...customStudioBase, size}
          : customStudioBase;
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
    <div className="lg:sticky lg:top-24">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-forest-600">Handcrafted in Indonesia</p>
      <h1 className="mt-2 font-display text-3xl leading-tight text-forest-900 sm:text-4xl">{product.name}</h1>
      <p className="mt-1 flex items-baseline gap-2 font-display text-2xl text-forest-800">
        {formatCurrency(product.priceIdr, currency)}
        {product.compareAtPriceIdr && product.compareAtPriceIdr > product.priceIdr ? (
          <span className="font-body text-base font-normal text-forest-400 line-through">
            {formatCurrency(product.compareAtPriceIdr, currency)}
          </span>
        ) : null}
      </p>

      {product.shortDescription ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-forest-600">{product.shortDescription}</p>
      ) : null}

      <div className="mt-6">
        <ProductCustomizer
          showSize={showSize}
          size={size}
          onSizeChange={setSize}
          hasBaseColour={product.hasBaseColour}
          baseColourOptions={product.baseColourOptions}
          baseColour={baseColour}
          onBaseColourChange={setBaseColour}
          hasHandleColour={product.hasHandleColour}
          handleColourOptions={product.handleColourOptions}
          handleColour={handleColour}
          onHandleColourChange={setHandleColour}
        />
      </div>

      <hr className="mt-6 border-forest-100" />

      <div className="mt-6 flex flex-col gap-3">
        {customStudioBase ? (
          <button
            type="button"
            onClick={() => void handleCustomiseThisBag()}
            disabled={customising}
            className="liquid-glass-dark button-lift w-full rounded-full px-6 py-3.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
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
              : "liquid-glass-dark button-lift w-full rounded-full px-6 py-3.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
          }
        >
          {outOfStock ? "Sold Out" : addedNotice ? "Added to Bag" : "Add to Bag"}
        </button>

        <p className="text-center text-[11px] text-forest-400">{stockLabel}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toggleWishlist(product.slug)}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="flex items-center gap-2 text-sm text-forest-700 transition-colors duration-200 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        >
          <Heart className={`h-4 w-4 transition-colors duration-200 ${wishlisted ? "fill-forest-900 text-forest-900" : "text-forest-500"}`} />
          {wishlisted ? "Wishlisted" : "Add to Wishlist"}
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
