"use client";

import Link from "next/link";
import {useCallback, useEffect, useRef, useState, type CSSProperties} from "react";
import {ChevronLeft, ChevronRight, Heart, ShoppingBag} from "lucide-react";
import {ImageWithFallback} from "@/components/image-with-fallback";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {colourSwatchStyle} from "@/lib/colour-library";
import {formatCurrency} from "@/lib/format";
import {baseSwatchesForProduct, galleryImagesFor, swatchesForProduct} from "@/lib/product-swatches";
import {CurrencyCode, Locale} from "@/lib/site";
import {DEFAULT_IMAGE_STYLE, ShopProduct, materialImageStyle} from "./shop-data";

const MAX_SWATCHES = 5;
// How much of a photograph may be trimmed to fill the tile edge to edge.
const MAX_TRIM = 0.14;

// One photograph in the tile. A shot whose proportions are close to the tile's
// fills it (object-cover  -  at most a sliver of backdrop is trimmed); anything
// that would lose real content, such as a tall portrait or a wide landscape, is
// shown whole (object-contain) over a soft blurred copy of itself, so the bars
// at its sides read as part of the picture.
function TileImage({
  src,
  alt,
  tileRatio,
  priority,
  sizes
}: {
  src: string;
  alt: string;
  tileRatio: number;
  priority: boolean;
  sizes: string;
}) {
  const [ratio, setRatio] = useState<number | null>(null);

  // A callback ref also catches an image that finished loading before React
  // attached to it (server-rendered, cached), which onLoad alone would miss.
  const readRatio = useCallback((image: HTMLImageElement | null) => {
    if (image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      setRatio(image.naturalWidth / image.naturalHeight);
    }
  }, []);

  const trim = ratio === null ? 1 : 1 - Math.min(ratio / tileRatio, tileRatio / ratio);
  const fits = trim <= MAX_TRIM;

  return (
    <>
      {!fits && ratio !== null ? (
        <ImageWithFallback src={src} alt="" aria-hidden fill sizes="64px" className="scale-125 object-cover opacity-80 blur-2xl" />
      ) : null}
      <ImageWithFallback
        imageRef={readRatio}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        draggable={false}
        className={fits ? "object-cover" : "object-contain"}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setRatio(image.naturalWidth / image.naturalHeight);
          }
        }}
      />
    </>
  );
}

// A piece in the catalogue: a rounded photo tile (swipeable when the piece has
// several photographs), then its name, its price and the colours it comes in.
// All the visuals live in the .catalogue-item* classes in globals.css (fixed
// light look in both themes).
//
// On desktop the grid this sits in is a fixed-height, two-rows-per-page
// momentum-scroll strip (see CatalogueClient), so an item must never grow
// taller than its row: the name is capped to a line and the photo tile takes
// whatever height is left. On a phone rows simply take their natural height.
export function ShopProductCard({
  product,
  currency,
  locale,
  priority = false
}: {
  product: ShopProduct;
  currency: CurrencyCode;
  locale: Locale;
  // The first screenful of photographs load eagerly; everything else is lazy.
  priority?: boolean;
}) {
  // The old per-material backdrop colour only tints the tile behind the photo,
  // so each piece keeps a hint of its fibre's colour.
  const tint = product.materials[0] ? materialImageStyle[product.materials[0]] : DEFAULT_IMAGE_STYLE;
  const {isWishlisted, toggle} = useWishlist();
  const favorited = isWishlisted(product.slug);
  const {addToCart} = useStorefront();

  const images = galleryImagesFor(product);
  const isBag = product.productType === "Bags";
  const swatches = isBag ? baseSwatchesForProduct(product) : swatchesForProduct(product);
  const sizeLetter = isBag && product.size ? product.size.charAt(0) : null;
  const shownSwatches = swatches.slice(0, MAX_SWATCHES);
  const hiddenSwatches = swatches.length - shownSwatches.length;

  // The tile's own proportions change with the screen (the rows share the
  // available height), so the photo-fit choice is re-made as it resizes.
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [tileRatio, setTileRatio] = useState(1);
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

  // Gallery: native scroll-snap does the swiping, so it is as light as it gets
  // and vertical page scrolling is never fought over. The extra photographs are
  // only mounted once someone touches, hovers or focuses the tile, so a page of
  // products loads one photograph each, not every gallery up front.
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryOpened, setGalleryOpened] = useState(false);
  const scrollFrame = useRef<number | null>(null);

  const openGallery = useCallback(() => setGalleryOpened(true), []);

  const handleScroll = useCallback(() => {
    if (scrollFrame.current !== null) {
      return;
    }
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      const gallery = galleryRef.current;
      if (gallery && gallery.clientWidth > 0) {
        setActiveIndex(Math.round(gallery.scrollLeft / gallery.clientWidth));
      }
    });
  }, []);

  useEffect(
    () => () => {
      if (scrollFrame.current !== null) {
        cancelAnimationFrame(scrollFrame.current);
      }
    },
    []
  );

  // Mouse drag-to-swipe (touch already swipes natively): the strip follows the
  // pointer, then eases to the photo it was dragged towards. A drag never counts
  // as a click on the card.
  const dragRef = useRef<{startX: number; lastX: number; startLeft: number; moved: boolean} | null>(null);
  const suppressClickRef = useRef(false);

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    const gallery = galleryRef.current;
    if (!gallery || images.length < 2 || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    dragRef.current = {startX: event.clientX, lastX: event.clientX, startLeft: gallery.scrollLeft, moved: false};
    try {
      gallery.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only a convenience (keeps the drag going outside the tile).
    }
    gallery.style.scrollSnapType = "none";
    gallery.style.cursor = "grabbing";
    setGalleryOpened(true);
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
    const gallery = galleryRef.current;
    const drag = dragRef.current;
    if (!gallery || !drag) {
      return;
    }
    drag.lastX = event.clientX;
    const delta = event.clientX - drag.startX;
    if (Math.abs(delta) > 5) {
      drag.moved = true;
    }
    gallery.scrollLeft = drag.startLeft - delta;
  }

  function handleDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    const gallery = galleryRef.current;
    const drag = dragRef.current;
    if (!gallery || !drag) {
      return;
    }
    dragRef.current = null;
    if (gallery.hasPointerCapture(event.pointerId)) {
      gallery.releasePointerCapture(event.pointerId);
    }
    const width = gallery.clientWidth || 1;
    // Use the last position seen while dragging: a cancelled pointer (which the
    // browser fires if it starts a native link drag) reports no usable position,
    // and reading it made every drag look like a swipe in the same direction.
    const delta = drag.lastX - drag.startX;
    const startIndex = Math.round(drag.startLeft / width);
    const target = Math.min(images.length - 1, Math.max(0, delta < -40 ? startIndex + 1 : delta > 40 ? startIndex - 1 : startIndex));
    gallery.style.scrollSnapType = "";
    gallery.style.cursor = "";
    gallery.scrollTo({left: target * width, behavior: "smooth"});
    if (drag.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }

  function step(direction: -1 | 1) {
    const gallery = galleryRef.current;
    if (gallery) {
      setGalleryOpened(true);
      gallery.scrollBy({left: direction * gallery.clientWidth, behavior: "smooth"});
    }
  }

  // "Rp2.250.000" -> a quiet currency mark beside the amount.
  const price = formatCurrency(product.priceIdr, currency);
  const priceParts = /^(\D+)(\d.*)$/.exec(price);

  const bagLabel = product.soldOut
    ? locale === "en"
      ? "Sold out"
      : "Habis terjual"
    : locale === "en"
      ? "Add to bag"
      : "Tambah ke tas";

  const sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

  return (
    <Link
      href={`/catalogue/${product.slug}`}
      className="catalogue-item group"
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      style={{"--item-tint": tint.bg} as CSSProperties}
      aria-label={product.name}
      onPointerEnter={images.length > 1 ? openGallery : undefined}
      onTouchStart={images.length > 1 ? openGallery : undefined}
      onFocus={images.length > 1 ? openGallery : undefined}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div ref={stageRef} className="catalogue-item-stage">
        <div
          ref={galleryRef}
          className="catalogue-gallery"
          onScroll={images.length > 1 ? handleScroll : undefined}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          {images.map((src, index) => (
            <div key={src} className="catalogue-gallery-slide">
              {index === 0 || galleryOpened ? (
                <TileImage
                  src={src}
                  alt={index === 0 ? product.name : `${product.name}, photo ${index + 1}`}
                  tileRatio={tileRatio}
                  priority={priority && index === 0}
                  sizes={sizes}
                />
              ) : null}
            </div>
          ))}
        </div>

        {product.soldOut ? <span className="catalogue-item-soldout">{locale === "en" ? "Sold Out" : "Habis Terjual"}</span> : null}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              disabled={activeIndex === 0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                step(-1);
              }}
              className="catalogue-item-arrow catalogue-item-arrow-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              disabled={activeIndex >= images.length - 1}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                step(1);
              }}
              className="catalogue-item-arrow catalogue-item-arrow-next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}

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
            className="catalogue-item-action"
          >
            <Heart className="h-4 w-4" />
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
            className="catalogue-item-action"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Photo position dots. The row is always reserved (blank for a single
          photo) so every card in a row has the same height. */}
      <div className="catalogue-item-dots" aria-hidden>
        {images.length > 1
          ? images.slice(0, 8).map((src, index) => (
              <span key={src} className="catalogue-item-dot" data-active={index === Math.min(activeIndex, 7)} />
            ))
          : null}
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
        {shownSwatches.length || sizeLetter ? (
          <ul className="catalogue-swatches" aria-label={locale === "en" ? "Size and available colours" : "Ukuran dan warna tersedia"}>
            {sizeLetter ? (
              <li
                role="img"
                aria-label={locale === "en" ? `Size ${product.size}` : `Ukuran ${product.size}`}
                title={`Size ${product.size}`}
                className={`catalogue-size catalogue-size-${sizeLetter.toLowerCase()}`}
              >
                {sizeLetter}
              </li>
            ) : null}
            {shownSwatches.map((colour) => (
              <li
                key={colour.label}
                role="img"
                aria-label={colour.label}
                title={colour.label}
                className="catalogue-swatch"
                style={colourSwatchStyle(colour)}
              />
            ))}
            {hiddenSwatches > 0 ? (
              <li className="catalogue-swatch-more" aria-label={`${hiddenSwatches} more colours`}>
                +{hiddenSwatches}
              </li>
            ) : null}
          </ul>
        ) : (
          <div className="catalogue-swatches-empty" aria-hidden />
        )}
      </div>
    </Link>
  );
}
