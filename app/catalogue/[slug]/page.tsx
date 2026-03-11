"use client";

import {notFound, useParams} from "next/navigation";
import {SectionHeading} from "@/components/section-heading";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import {formatCurrency} from "@/lib/format";

export default function ProductPage() {
  const params = useParams<{slug: string}>();
  const {locale, currency} = useSitePreferences();
  const {resolveProduct, addToCart, startBankTransferForProduct, openPreview} = useStorefront();
  const product = resolveProduct(params.slug, locale);

  if (!product) {
    notFound();
  }

  return (
    <main className="shell py-16">
      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div
          className="card min-h-[520px] bg-cover bg-center"
          style={{backgroundImage: `url(${product.imageUrl})`}}
        />
        <div className="space-y-6">
          <SectionHeading
            eyebrow={locale === "en" ? "Catalogue Detail" : "Detail Katalog"}
            title={product.title}
            body={product.description}
          />
          <p className="font-display text-4xl text-forest-900">{formatCurrency(product.priceIdr, currency)}</p>
          <p className="text-base leading-8 text-forest-700">{product.story}</p>
          <div className="flex flex-wrap gap-2">
            {product.materials.map((material) => (
              <span key={material} className="rounded-full border border-forest-100 bg-white px-3 py-1 text-xs text-forest-600">
                {material}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => addToCart(product.slug)} className="button-lift rounded-full bg-forest-900 px-6 py-3 text-sm text-sand-50">
              {locale === "en" ? "Add to cart" : "Tambah ke keranjang"}
            </button>
            <button type="button" onClick={() => startBankTransferForProduct(product.slug)} className="button-lift rounded-full border border-forest-200 px-6 py-3 text-sm text-forest-700">
              {locale === "en" ? "Buy with bank transfer" : "Beli via transfer bank"}
            </button>
            <button type="button" onClick={() => openPreview(product.slug)} className="button-lift rounded-full border border-forest-200 px-6 py-3 text-sm text-forest-700">
              {locale === "en" ? "Preview piece" : "Preview karya"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
