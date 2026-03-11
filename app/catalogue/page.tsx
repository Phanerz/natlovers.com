"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import {useSearchParams} from "next/navigation";
import {ProductCard} from "@/components/product-card";
import {Reveal} from "@/components/reveal";
import {SectionHeading} from "@/components/section-heading";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import {CollectionSlug} from "@/lib/data";

const collectionOptions: CollectionSlug[] = ["bags", "clothing", "dolls", "accessories"];

export default function CataloguePage() {
  const {locale, currency} = useSitePreferences();
  const {getProducts} = useStorefront();
  const searchParams = useSearchParams();
  const products = getProducts(locale);
  const activeCollection = (
    searchParams.get("category")
    ?? searchParams.get("collection")
  ) as CollectionSlug | null;

  const filteredProducts = activeCollection
    ? products.filter((product) => product.collection === activeCollection)
    : products;

  const labels = {
    en: {
      all: "All",
      bags: "Bags",
      clothing: "Clothing",
      dolls: "Dolls",
      accessories: "Accessories",
      emptyTitle: "This collection is being curated.",
      emptyBody: "We are preparing a fuller presentation for this part of the Natlovers house. Please browse another collection or explore all pieces."
    },
    id: {
      all: "Semua",
      bags: "Tas",
      clothing: "Busana",
      dolls: "Boneka",
      accessories: "Aksesori",
      emptyTitle: "Koleksi ini sedang dikurasi.",
      emptyBody: "Kami sedang menyiapkan presentasi yang lebih lengkap untuk bagian rumah Natlovers ini. Silakan jelajahi koleksi lain atau lihat semua karya."
    }
  }[locale];

  return (
    <main className="shell py-16 space-y-8 page-enter">
      <Reveal>
        <SectionHeading
          eyebrow={locale === "en" ? "Catalogue" : "Katalog"}
          title={
            locale === "en" ? "Collectible handbags and crafted objects." : "Tas koleksi dan objek kriya pilihan."
          }
          body={
            locale === "en"
              ? "Search, filter, and browse ready-to-ship works. This first version includes gallery-led product storytelling and a path to purchase or commission."
              : "Cari, filter, dan jelajahi karya yang siap dikirim. Versi awal ini menghadirkan storytelling bergaya galeri serta jalur untuk membeli atau memesan custom."
          }
        />
      </Reveal>
      <Reveal delay={80}>
        <div className="card motion-card flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <input
            placeholder={locale === "en" ? "Search by motif, material, or collection" : "Cari berdasarkan motif, material, atau koleksi"}
            className="w-full rounded-full border border-forest-100 px-5 py-3 outline-none md:max-w-md"
          />
          <div className="flex flex-wrap gap-3">
            <Link href="/catalogue" className={`button-lift rounded-full border px-4 py-2 text-sm ${!activeCollection ? "border-forest-900 bg-forest-900 text-sand-50" : "border-forest-100 text-forest-700"}`}>
              {labels.all}
            </Link>
            {collectionOptions.map((filter) => (
              <Link
                key={filter}
                href={{pathname: "/catalogue", query: {category: filter}}}
                className={`button-lift rounded-full border px-4 py-2 text-sm ${activeCollection === filter ? "border-forest-900 bg-forest-900 text-sand-50" : "border-forest-100 text-forest-700"}`}
              >
                {labels[filter]}
              </Link>
            ))}
          </div>
        </div>
      </Reveal>
      {filteredProducts.length ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {filteredProducts.map((product, index) => (
            <Reveal key={product.slug} delay={120 + index * 80}>
              <ProductCard product={product} locale={locale} currency={currency} />
            </Reveal>
          ))}
        </div>
      ) : (
        <Reveal delay={140}>
          <div className="card p-10 text-center">
            <h3 className="font-display text-3xl text-forest-900">{labels.emptyTitle}</h3>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-forest-700">{labels.emptyBody}</p>
          </div>
        </Reveal>
      )}
    </main>
  );
}
