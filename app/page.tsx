"use client";

import {Hero} from "@/components/hero";
import {Reveal} from "@/components/reveal";
import {SectionHeading} from "@/components/section-heading";
import {ProductCard} from "@/components/product-card";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";

export default function HomePage() {
  const {locale, currency} = useSitePreferences();
  const {getProducts} = useStorefront();

  const products = getProducts(locale);

  return (
    <main className="pb-24">
      <Hero locale={locale} currency={currency} />

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
              ? "Curate, preview, and edit these pieces from the storefront while the full studio system is still being built."
              : "Kurasi, preview, dan edit karya-karya ini langsung dari storefront selagi sistem studio penuh sedang dibangun."
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