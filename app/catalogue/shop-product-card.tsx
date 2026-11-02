"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState, type CSSProperties} from "react";
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

  // Fit the photograph to its square tile. A shot whose proportions are close
  // to the tile's fills it edge to edge (object-cover  -  at most a sliver of
  // backdrop is trimmed); anything that would lose real content, such as a
  // tall portrait or a wide landscape, is shown whole (object-contain) and
  // centred instead. The tile's own proportions change with the screen (the
  // rows share the available height), so the choice is re-made on resize.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tileRatio, setTileRatio] = useState(1);
  const [imageRatio, setImageRatio] = useState<number | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const measure = () => {
      const {width, height} = stage.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setTileRatio(Math.round((width / height) * 20) / 20);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // A callback ref also catches an image that finished loading before React
  // attached to it (server-rendered, cached), which onLoad alone would miss.
  const readImageRatio = useCallback((image: HTMLImageElement | null) => {
    if (image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      setImageRatio(image.naturalWidth / image.naturalHeight);
    }
  }, []);

  const MAX_TRIM = 0.14;
  const trim = imageRatio === null ? 1 : 1 - Math.min(imageRatio / tileRatio, tileRatio / imageRatio);
  const fitClass = trim <= MAX_TRIM ? "object-cover" : "object-contain";

  const attributes = [
    product.size ? sizeLabels[product.size][locale] : null,
    product.shape ? shapeLabels[product.shape][locale] : null,
    ...product.handles.map((handle) => handleLabels[handle][locale]),
    product.accessoryCategory ? accessoryCategoryLabels[product.accessoryCategory][locale] : null
  ].filter((value): value is string => Boolean(value));

  // "Rp2.250.000" -> a quiet currency mark beside a confident amount.
  const price = formatCurrency(product.priceIdr, currency);
  const priceParts = /^(\D+)(\d.*)$/.exec(price);

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
      <div ref={stageRef} className="catalogue-item-stage">
        <div className="catalogue-item-photo">
          {/* A photo that has to be shown whole (a tall portrait, a wide landscape)
              leaves bars at its sides; a soft blurred copy of the same photo behind
              it tints them with its own colours, so the bars read as part of the
              picture instead of a separate band. */}
          {fitClass === "object-contain" && imageRatio !== null ? (
            <ImageWithFallback
              src={product.imageUrl}
              alt=""
              aria-hidden
              fill
              sizes="64px"
              className="scale-125 object-cover opacity-80 blur-2xl"
            />
          ) : null}
          <ImageWithFallback
            imageRef={readImageRatio}
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className={fitClass}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                setImageRatio(image.naturalWidth / image.naturalHeight);
              }
            }}
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
        <p className="catalogue-item-price">
          {priceParts ? (
            <>
              <span className="catalogue-item-currency">{priceParts[1]}</span>
              <span className="catalogue-item-amount">{priceParts[2]}</span>
            </>
          ) : (
            price
          )}
        </p>
        {attributes.length ? <p className="catalogue-item-meta">{attributes.join(" · ")}</p> : null}
      </div>
    </Link>
  );
}
