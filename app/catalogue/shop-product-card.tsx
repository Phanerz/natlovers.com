"use client";

import Link from "next/link";
import type {CSSProperties} from "react";
import {Heart, ShoppingBag} from "lucide-react";
import {ImageWithFallback} from "@/components/image-with-fallback";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {formatCurrency} from "@/lib/format";
import {CurrencyCode, Locale} from "@/lib/site";
import {
  DEFAULT_IMAGE_STYLE,
  ShopProduct,
  accessoryCategoryLabels,
  handleLabels,
  materialImageStyle,
  shapeLabels,
  sizeLabels
} from "./shop-data";

// A piece in the catalogue: a rounded photo tile with the name, price and a
// single understated attributes line directly beneath it. All the visuals live in the .catalogue-item* classes in globals.css
// (fixed light look in both themes, like the old name/price scrim).
//
// The grid this sits in is a fixed-height, two-rows-per-page momentum-scroll
// strip (see CatalogueClient), so an item must never grow taller than its row:
// the name, price and attributes are each capped to one line, and the photo
// tile takes whatever height is left. The photograph itself is
// object-contain  -  never cropped, stretched or replaced  -  so square and
// portrait shots both sit centred on the same stage.
export function ShopProductCard({
  product,
  currency,
  locale
}: {
  product: ShopProduct;
  currency: CurrencyCode;
  locale: Locale;
}) {
  // The old per-material backdrop colour now only tints the pool of light
  // behind the photo, so each piece keeps a hint of its fibre's colour without
  // sitting in a coloured block.
  const tint = product.materials[0] ? materialImageStyle[product.materials[0]] : DEFAULT_IMAGE_STYLE;
  const {isWishlisted, toggle} = useWishlist();
  const favorited = isWishlisted(product.slug);
  const {addToCart} = useStorefront();

  const attributes = [
    product.size ? sizeLabels[product.size][locale] : null,
    product.shape ? shapeLabels[product.shape][locale] : null,
    ...product.handles.map((handle) => handleLabels[handle][locale]),
    product.accessoryCategory ? accessoryCategoryLabels[product.accessoryCategory][locale] : null
  ].filter((value): value is string => Boolean(value));

  const bagLabel = product.soldOut
    ? locale === "en"
      ? "Sold out"
      : "Habis terjual"
    : locale === "en"
      ? "Add to bag"
      : "Tambah ke tas";

  return (
    <Link
      href={`/catalogue/${product.slug}`}
      className="catalogue-item group"
      style={{"--item-tint": tint.bg} as CSSProperties}
      aria-label={product.name}
    >
      <div className="catalogue-item-stage">
        <div className="catalogue-item-photo">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-contain"
          />
        </div>

        {product.soldOut ? <span className="catalogue-item-soldout">{locale === "en" ? "Sold Out" : "Habis Terjual"}</span> : null}

        <div className="catalogue-item-actions">
          <button
            type="button"
            aria-label={favorited ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={favorited}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggle(product.slug);
            }}
            className="catalogue-item-action liquid-glass-on-light"
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-[#344332] text-[#344332]" : "text-[#344332]"}`} />
          </button>

          <button
            type="button"
            disabled={product.soldOut}
            title={bagLabel}
            aria-label={bagLabel}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              addToCart(product.slug);
            }}
            className="catalogue-item-action liquid-glass-on-light"
          >
            <ShoppingBag className="h-4 w-4 text-[#344332]" />
          </button>
        </div>
      </div>

      <div className="catalogue-item-info">
        <p className="catalogue-item-name">{product.name}</p>
        <p className="catalogue-item-price">{formatCurrency(product.priceIdr, currency)}</p>
        {attributes.length ? <p className="catalogue-item-meta">{attributes.join(" · ")}</p> : null}
      </div>
    </Link>
  );
}
