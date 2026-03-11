"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { useSitePreferences } from "@/components/site-preferences-provider";
import { useStorefront } from "@/components/storefront-provider";
import { CollectionSlug } from "@/lib/data";

const collectionGallery: Array<{
  slug: CollectionSlug;
  imageUrl: string;
  title: { en: string; id: string };
  note: { en: string; id: string };
  meta: { en: string; id: string };
  tint: string;
}> = [
  {
    slug: "bags",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80",
    title: { en: "Bags", id: "Tas" },
    note: {
      en: "Story-led handbags and woven heirlooms.",
      id: "Tas bercerita dan pusaka anyaman."
    },
    meta: { en: "Cabinet I", id: "Kabinet I" },
    tint: "from-[#d1b37b]/54 via-[#8f6a35]/12 to-transparent"
  },
  {
    slug: "clothing",
    imageUrl:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1200&q=80",
    title: { en: "Clothing", id: "Busana" },
    note: {
      en: "Garments imagined with textile character.",
      id: "Busana dengan karakter tekstil yang kuat."
    },
    meta: { en: "Cabinet II", id: "Kabinet II" },
    tint: "from-[#6a866e]/42 via-[#385240]/10 to-transparent"
  },
  {
    slug: "dolls",
    imageUrl:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80",
    title: { en: "Dolls", id: "Boneka" },
    note: {
      en: "Whimsical figures filled with personality.",
      id: "Figur whimsical yang penuh karakter."
    },
    meta: { en: "Cabinet III", id: "Kabinet III" },
    tint: "from-[#c7a779]/46 via-[#765530]/10 to-transparent"
  },
  {
    slug: "accessories",
    imageUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    title: { en: "Accessories", id: "Aksesori" },
    note: {
      en: "Small crafted objects for collectors and gifts.",
      id: "Objek kecil pilihan untuk kolektor dan hadiah."
    },
    meta: { en: "Cabinet IV", id: "Kabinet IV" },
    tint: "from-[#506a54]/42 via-[#21382a]/10 to-transparent"
  }
];

export default function CatalogueClient() {
  const { locale, currency } = useSitePreferences();
  const { getProducts } = useStorefront();
  const products = getProducts(locale);

  return (
    <main className="pb-24 pt-[120px]">

      {/* Collection Gallery */}

      <Reveal className="shell mt-[55px]" delay={120}>
        <section className="overflow-hidden rounded-[2.8rem] border border-[#ccb488]/45 bg-[linear-gradient(180deg,#f6f0e7_0%,#e9dfcd_100%)] shadow-[0_24px_80px_rgba(48,33,16,0.12)]">

          <div className="relative border-b border-[#ccb488]/45 bg-[linear-gradient(180deg,#f6f0e7_0%,#efe4d5_100%)] px-6 py-[34px] sm:px-10 lg:px-[55px]">

            <div className="absolute inset-x-0 top-0 h-[8px] bg-[linear-gradient(90deg,#294131_0%,#294131_61.8%,#dcc9a2_61.8%,#dcc9a2_100%)]" />

            <p className="text-[11px] uppercase tracking-[0.36em] text-[#7c6641]">
              {locale === "en"
                ? "Gallery Collection Browser"
                : "Browser Koleksi Galeri"}
            </p>

            <h2 className="mt-[13px] max-w-4xl font-display text-[clamp(2.3rem,4vw,4.3rem)] leading-[0.94] text-[#5c4320]">
              {locale === "en"
                ? "Browse the Natlovers gallery wall."
                : "Jelajahi dinding galeri Natlovers."}
            </h2>

            <p className="mt-[21px] max-w-3xl text-sm leading-7 text-[#5d4d33] sm:text-base">
              {locale === "en"
                ? "Each collection is presented like a framed object in a quiet exhibition room."
                : "Setiap koleksi ditampilkan seperti objek berbingkai di ruang pamer yang tenang."}
            </p>
          </div>

          {/* Gallery Grid */}

          <div className="px-6 py-[34px] sm:px-10 lg:px-[55px] lg:py-[55px]">
            <div className="grid gap-[20px] md:grid-cols-2 lg:grid-cols-4">

              {collectionGallery.map((collection, index) => (
                <Reveal key={collection.slug} delay={150 + index * 90}>

                  <Link
                    href={{
                      pathname: "/catalogue",
                      query: { category: collection.slug }
                    }}
                    className="group block"
                  >

                    <div className="relative overflow-hidden rounded-[1.6rem] border border-[#d9c49a]/30">

                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.045]"
                        style={{
                          backgroundImage: `url(${collection.imageUrl})`
                        }}
                      />

                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${collection.tint}`}
                      />

                    </div>

                    <div className="mt-4 text-center text-[#f8efdc]">

                      <p className="text-[10px] uppercase tracking-[0.3em] text-[#d8c49a]">
                        {collection.meta[locale]}
                      </p>

                      <h3 className="mt-3 font-display text-[2rem] italic">
                        {collection.title[locale]}
                      </h3>

                      <p className="mx-auto mt-3 max-w-[24ch] text-sm">
                        {collection.note[locale]}
                      </p>

                    </div>

                  </Link>

                </Reveal>
              ))}

            </div>
          </div>

        </section>
      </Reveal>


      {/* Featured Products */}

      <Reveal className="shell mt-[55px] space-y-8" delay={140}>

        <SectionHeading
          eyebrow={locale === "en" ? "Featured Works" : "Karya Unggulan"}
          title={
            locale === "en"
              ? "Gallery pieces ready to be carried."
              : "Karya galeri yang siap dibawa."
          }
          body={
            locale === "en"
              ? "Curate, preview, and edit these pieces from the storefront."
              : "Kurasi, preview, dan edit karya-karya ini langsung dari storefront."
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">

          {products.map((product, index) => (
            <Reveal key={product.slug} delay={180 + index * 80}>
              <ProductCard
                product={product}
                locale={locale}
                currency={currency}
              />
            </Reveal>
          ))}

        </div>

      </Reveal>

    </main>
  );
}