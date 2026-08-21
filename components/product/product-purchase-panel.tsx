"use client";

import {useMemo, useState} from "react";
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";
import {Heart, Share2, Sparkles} from "lucide-react";
import {Toast, ToastState} from "@/components/admin/toast";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {formatCurrency} from "@/lib/format";
import {ConfigPanel, FieldLabel, PillRow} from "@/components/custom-studio/config-panel";
import {EstimatePanel} from "@/components/custom-studio/review-panel";
import {calculateEstimate, emptyPricingBasis} from "@/lib/custom-pricing";
import {LOCAL_CUSTOM_DRAFT_KEY, customBagHandles, type CustomConfig, type LocalCustomDraft} from "@/lib/custom-studio";
import {defaultConfigForProduct} from "@/lib/product-customization";
import type {AdminProduct} from "@/lib/admin-products";

export function ProductPurchasePanel({product}: {product: AdminProduct}) {
  const router = useRouter();
  const {status} = useSession();
  const signedIn = status === "authenticated";
  const {currency} = useSitePreferences();
  const {addToCart} = useStorefront();
  const {isWishlisted, toggle: toggleWishlist} = useWishlist();

  const initialConfig = useMemo(() => defaultConfigForProduct(product), [product]);
  const [config, setConfig] = useState<CustomConfig | null>(initialConfig);
  const [addedNotice, setAddedNotice] = useState(false);
  const [customising, setCustomising] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const basis = useMemo(() => ({...emptyPricingBasis, [product.productType]: product.priceIdr}), [product]);
  const estimate = config ? calculateEstimate(config, basis) : null;
  // Only worth showing as a breakdown once a selection actually moves the
  // price away from the base — right now every Custom Studio modifier is
  // still zero (see lib/custom-pricing.ts), so this stays hidden rather than
  // implying options cost something they don't yet.
  const priceAffectedByConfig = Boolean(estimate && estimate.totalIdr !== estimate.basePriceIdr);
  const displayPriceIdr = estimate ? estimate.totalIdr : product.priceIdr;

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
    addToCart(product.slug, 1, config);
    setAddedNotice(true);
    window.setTimeout(() => setAddedNotice(false), 2500);
  }

  async function handleCustomiseThisBag() {
    if (!config || customising) return;
    setCustomising(true);
    try {
      const draft: LocalCustomDraft = {productType: config.productType, config, notes: ""};
      try {
        window.localStorage.setItem(LOCAL_CUSTOM_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        // Private-browsing quota failure — the PUT below (when signed in) is
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
        // User cancelled the native share sheet — nothing to report.
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
      <p className="mt-1 font-display text-2xl text-forest-800">{formatCurrency(displayPriceIdr, currency)}</p>

      {product.description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-forest-600">{product.description}</p>
      ) : null}

      {config ? (
        <div className="mt-6 rounded-2xl border border-[#e0d8c7] bg-[#fdfaf3] p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-forest-500">
            <Sparkles className="h-3.5 w-3.5" />
            Make it yours
          </p>
          <ConfigPanel config={config} onChange={setConfig} />

          {/* Custom Studio's own ConfigPanel stopped asking for a handle
              (see the comment on bagConfigSchema in lib/custom-studio.ts),
              but the field is still real — still priced, validated, and
              carried through to the order — so the product page is where
              it's set, seeded from this product's actual handle type. */}
          {config.productType === "Bags" ? (
            <div className="mt-4 space-y-1.5">
              <FieldLabel hint={config.handle}>Handle</FieldLabel>
              <PillRow
                options={customBagHandles}
                value={config.handle ?? customBagHandles[0]}
                onSelect={(handle) => setConfig({...config, handle: handle as typeof config.handle})}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {priceAffectedByConfig ? (
        <div className="mt-4">
          <EstimatePanel estimate={estimate} currency={currency} />
        </div>
      ) : null}

      <hr className="mt-6 border-forest-100" />

      <div className="mt-6 flex flex-col gap-3">
        {config ? (
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
            config
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
