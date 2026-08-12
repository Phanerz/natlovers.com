"use client";

import {useEffect, useState} from "react";
import {notFound, useParams} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {ChevronRight} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import {formatCurrency} from "@/lib/format";
import {materialImageStyle, materialLabels, shapeLabels, sizeLabels, sizePillStyle} from "@/app/catalogue/shop-data";
import type {AdminProduct} from "@/lib/admin-products";

const DESCRIPTION_MAX_LENGTH = 140;

function shortenDescription(description: string | null): string | null {
  const trimmed = description?.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length <= DESCRIPTION_MAX_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, DESCRIPTION_MAX_LENGTH).trimEnd()}…`;
}

export default function ProductPage() {
  const params = useParams<{slug: string}>();
  const {locale, currency} = useSitePreferences();
  const {addToCart} = useStorefront();

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [activeImage, setActiveImage] = useState(0);

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
  }, [product?.slug]);

  if (products === null) {
    return (
      <main className="shell flex min-h-[70vh] items-center justify-center py-16">
        <p className="muted">{locale === "en" ? "Loading..." : "Memuat..."}</p>
      </main>
    );
  }

  if (!product || product.soldOut || !product.isActive) {
    notFound();
  }

  const images = product.images.length ? product.images : [product.imageUrl].filter(Boolean);
  const shortDescription = shortenDescription(product.description);

  return (
    <main className="shell py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium tracking-[0.08em] text-forest-600">
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

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="flex gap-4">
          {images.length > 1 ? (
            <div className="flex shrink-0 flex-col gap-3">
              {images.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  aria-label={`${locale === "en" ? "Show image" : "Tampilkan gambar"} ${index + 1}`}
                  onClick={() => setActiveImage(index)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(20,33,22,0.16)] transition-all duration-200 sm:h-20 sm:w-20 ${
                    index === activeImage
                      ? "ring-2 ring-forest-700 ring-offset-2 ring-offset-[#f7f4ee]"
                      : "opacity-65 hover:opacity-100"
                  }`}
                >
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          ) : null}

          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] shadow-[0_32px_80px_rgba(20,33,22,0.2)]">
            {images[activeImage] ? (
              <Image
                src={images[activeImage]}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[#eee7d8]" />
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/40 bg-white/55 p-6 shadow-[0_24px_60px_rgba(20,33,22,0.1)] backdrop-blur-xl sm:p-8 lg:sticky lg:top-24">
          <p className="font-display text-3xl leading-tight text-forest-900 sm:text-4xl">{product.name}</p>
          <p className="mt-2 font-display text-2xl text-forest-700">{formatCurrency(product.priceIdr, currency)}</p>

          {shortDescription ? <p className="mt-4 text-sm leading-6 text-forest-600">{shortDescription}</p> : null}

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
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={{backgroundColor: sizePillStyle.bg, borderColor: sizePillStyle.border, color: sizePillStyle.text}}
            >
              {sizeLabels[product.size][locale]}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={{backgroundColor: sizePillStyle.bg, borderColor: sizePillStyle.border, color: sizePillStyle.text}}
            >
              {shapeLabels[product.shape][locale]}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => addToCart(product.slug)}
              className="button-lift rounded-full bg-forest-900 px-6 py-3.5 text-sm font-semibold text-sand-50"
            >
              {locale === "en" ? "Add to Bag" : "Tambah ke Tas"}
            </button>
            <Link
              href="/custom"
              className="button-lift rounded-full border border-forest-300 px-6 py-3.5 text-center text-sm font-semibold text-forest-700"
            >
              {locale === "en" ? "Request in a different color" : "Minta warna berbeda"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
