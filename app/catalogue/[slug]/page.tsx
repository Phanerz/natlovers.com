"use client";

import {useEffect, useRef, useState} from "react";
import {notFound, useParams} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {ChevronLeft, ChevronRight, Heart, Maximize2, Share2, X} from "lucide-react";
import {Toast, ToastState} from "@/components/admin/toast";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import {useWishlist} from "@/components/use-wishlist";
import {formatCurrency} from "@/lib/format";
import {
  accessoryCategoryLabels,
  categoryPillStyle,
  handleLabels,
  handlePillStyle,
  materialImageStyle,
  materialLabels,
  shapeLabels,
  sizeLabels,
  sizePillStyle
} from "@/app/catalogue/shop-data";
import type {AdminProduct} from "@/lib/admin-products";

function Skeleton() {
  return (
    <main className="shell page-enter py-10 sm:py-14">
      <div className="mb-6 h-4 w-56 animate-pulse rounded-full bg-[#eee7d8]" />
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[34px] xl:gap-[55px]">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="hidden shrink-0 gap-3 lg:flex lg:w-20 lg:flex-col">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-20 w-20 animate-pulse rounded-xl bg-[#eee7d8]" />
            ))}
          </div>
          <div className="aspect-[4/5] w-full animate-pulse rounded-[1.4rem] bg-[#eee7d8]" />
        </div>
        <div className="space-y-4">
          <div className="h-3 w-40 animate-pulse rounded-full bg-[#eee7d8]" />
          <div className="h-9 w-3/4 animate-pulse rounded-full bg-[#eee7d8]" />
          <div className="h-7 w-32 animate-pulse rounded-full bg-[#eee7d8]" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-[#eee7d8]" />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-[#eee7d8]" />
            ))}
          </div>
          <div className="h-12 w-full animate-pulse rounded-full bg-[#eee7d8]" />
          <div className="h-12 w-full animate-pulse rounded-full bg-[#eee7d8]" />
        </div>
      </div>
    </main>
  );
}

function Lightbox({
  images,
  index,
  name,
  onIndexChange,
  onClose
}: {
  images: string[];
  index: number;
  name: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight" && images.length > 1) {
        onIndexChange((index + 1) % images.length);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        onIndexChange((index - 1 + images.length) % images.length);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, images.length, onIndexChange, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} image viewer`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close image viewer"
        className="liquid-glass icon-button absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[#fff7e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            aria-label="Previous image"
            className="liquid-glass icon-button absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#fff7e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            aria-label="Next image"
            className="liquid-glass icon-button absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#fff7e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      <div className="relative h-[80vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        {images[index] ? (
          <Image src={images[index]} alt={`${name} ${index + 1}`} fill sizes="90vw" className="object-contain" />
        ) : null}
      </div>
    </div>
  );
}

export default function ProductPage() {
  const params = useParams<{slug: string}>();
  const {locale, currency} = useSitePreferences();
  const {addToCart} = useStorefront();
  const {isWishlisted, toggle: toggleWishlist} = useWishlist();

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [imgOpacity, setImgOpacity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/products", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!cancelled) {
          setProducts(Array.isArray(data) ? (data as AdminProduct[]) : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const product = products?.find((item) => item.slug === params.slug) ?? null;

  useEffect(() => {
    setActiveImage(0);
    setImgOpacity(1);
  }, [product?.slug]);

  useEffect(
    () => () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    },
    []
  );

  function selectImage(index: number) {
    if (index === activeImage) {
      return;
    }
    setImgOpacity(0);
    fadeTimeoutRef.current = window.setTimeout(() => {
      setActiveImage(index);
      setImgOpacity(1);
    }, 90);
  }

  if (products === null) {
    return <Skeleton />;
  }

  // Sold-out products still get a page (just a disabled "Sold Out" button
  // below) — only missing/deactivated products 404.
  if (!product || !product.isActive) {
    notFound();
  }

  const images = product.images.length ? product.images : [product.imageUrl].filter(Boolean);
  const wishlisted = isWishlisted(product.slug);

  async function handleShare() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({title: product!.name, url});
      } catch {
        // User cancelled the native share sheet, nothing to report.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast({type: "success", message: locale === "en" ? "Link copied to clipboard." : "Tautan disalin."});
    } catch {
      setToast({type: "error", message: locale === "en" ? "Could not copy the link." : "Tidak dapat menyalin tautan."});
    }
  }

  return (
    <main className="shell page-enter py-10 sm:py-14">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium tracking-[0.08em] text-forest-700"
      >
        <Link href="/" className="transition-colors duration-200 hover:text-forest-900">
          {locale === "en" ? "Home" : "Beranda"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-forest-300" />
        <Link href="/catalogue" className="transition-colors duration-200 hover:text-forest-900">
          {locale === "en" ? "Catalogue" : "Katalog"}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-forest-300" />
        <span className="text-forest-900">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[34px] xl:gap-[55px]">
        <div className="flex flex-col gap-4 lg:flex-row">
          {images.length > 1 ? (
            <div className="order-2 flex gap-3 overflow-x-auto pb-1 lg:order-1 lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0">
              {images.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  aria-label={`${product!.name} ${locale === "en" ? "image" : "gambar"} ${index + 1}`}
                  onClick={() => selectImage(index)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 lg:h-20 lg:w-20 ${
                    index === activeImage ? "ring-2 ring-forest-900" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={url} alt={`${product!.name} ${index + 1}`} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div
            className="relative order-1 aspect-[4/5] w-full overflow-hidden rounded-[1.4rem] shadow-[0_24px_60px_rgba(20,33,22,0.18)] lg:order-2"
            style={{backgroundColor: materialImageStyle[product.materials[0]]?.bg ?? "#eee7d8"}}
          >
            {images[activeImage] ? (
              <div className="relative h-full w-full" style={{opacity: imgOpacity, transition: "opacity 180ms ease"}}>
                <Image
                  src={images[activeImage]}
                  alt={product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover"
                />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={locale === "en" ? "View full image" : "Lihat gambar penuh"}
              className="liquid-glass-on-light icon-button absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-forest-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-forest-600">
            {locale === "en" ? "Handcrafted in Indonesia" : "Dibuat tangan di Indonesia"}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight text-forest-900 sm:text-4xl">{product.name}</h1>
          <p className="mt-1 font-display text-2xl text-forest-800">{formatCurrency(product.priceIdr, currency)}</p>

          <hr className="mt-5 border-forest-100" />

          {product.description ? (
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-forest-600">{product.description}</p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {product.materials.map((material) => {
              const style = materialImageStyle[material];
              return (
                <span
                  key={material}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{backgroundColor: style.bg, borderColor: style.border, color: "#3d3d33"}}
                >
                  {materialLabels[material][locale]}
                </span>
              );
            })}
            {product.size ? (
              <span
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{backgroundColor: sizePillStyle.bg, borderColor: sizePillStyle.border, color: sizePillStyle.text}}
              >
                {sizeLabels[product.size][locale]}
              </span>
            ) : null}
            {product.handle ? (
              <span
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{backgroundColor: handlePillStyle.bg, borderColor: handlePillStyle.border, color: handlePillStyle.text}}
              >
                {handleLabels[product.handle][locale]}
              </span>
            ) : null}
            {product.accessoryCategory ? (
              <span
                className="rounded-full border px-3 py-1 text-xs font-medium"
                style={{backgroundColor: categoryPillStyle.bg, borderColor: categoryPillStyle.border, color: categoryPillStyle.text}}
              >
                {accessoryCategoryLabels[product.accessoryCategory][locale]}
              </span>
            ) : null}
          </div>

          <hr className="mt-6 border-forest-100" />

          <div className="mt-6 flex flex-col gap-3">
            {product.soldOut ? (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-full bg-[#e4dfd2] px-6 py-3.5 text-sm font-semibold text-forest-400"
              >
                {locale === "en" ? "Sold Out" : "Habis Terjual"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => addToCart(product.slug)}
                className="liquid-glass-dark button-lift w-full rounded-full px-6 py-3.5 text-sm font-semibold text-sand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
              >
                {locale === "en" ? "Add to Bag" : "Tambah ke Tas"}
              </button>
            )}
            <Link
              href="/custom"
              className="button-lift w-full rounded-full border-2 border-forest-300 bg-white/80 px-6 py-3.5 text-center text-sm font-semibold text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            >
              {locale === "en" ? "Request a Different Color" : "Minta Warna Berbeda"}
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => toggleWishlist(product.slug)}
              aria-label={
                wishlisted
                  ? locale === "en"
                    ? "Remove from wishlist"
                    : "Hapus dari wishlist"
                  : locale === "en"
                    ? "Add to wishlist"
                    : "Tambah ke wishlist"
              }
              className="flex items-center gap-2 text-sm text-forest-700 transition-colors duration-200 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            >
              <Heart className={`h-4 w-4 transition-colors duration-200 ${wishlisted ? "fill-forest-900 text-forest-900" : "text-forest-500"}`} />
              {locale === "en" ? "Add to Wishlist" : "Tambah ke Wishlist"}
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label={locale === "en" ? "Share this product" : "Bagikan produk ini"}
              className="flex items-center gap-2 text-sm text-forest-700 transition-colors duration-200 hover:text-forest-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
            >
              <Share2 className="h-4 w-4 text-forest-500" />
              {locale === "en" ? "Share" : "Bagikan"}
            </button>
          </div>
        </div>
      </div>

      {lightboxOpen ? (
        <Lightbox
          images={images}
          index={activeImage}
          name={product.name}
          onIndexChange={setActiveImage}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </main>
  );
}
