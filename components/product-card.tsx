"use client";

import Link from "next/link";
import {Eye} from "lucide-react";
import {ProductCard as ProductCardType} from "@/lib/data";
import {CurrencyCode, Locale} from "@/lib/site";
import {formatCurrency} from "@/lib/format";
import {getDictionary} from "@/lib/translations";
import {useStorefront} from "@/components/storefront-provider";

export function ProductCard({
  product,
  locale,
  currency
}: {
  product: ProductCardType;
  locale: Locale;
  currency: CurrencyCode;
}) {
  const dict = getDictionary(locale);
  const {addToCart, openPreview} = useStorefront();

  return (
    <article className="card motion-card group overflow-hidden">
      <div
        className="h-72 w-full bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        style={{
          backgroundImage: `url(${product.imageUrl})`
        }}
      />
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl text-forest-900">{product.title}</p>
            <p className="mt-2 text-sm leading-7 text-forest-700">{product.description}</p>
          </div>
          <p className="rounded-full bg-sand-100 px-3 py-1 text-sm text-forest-900">
            {formatCurrency(product.priceIdr, currency)}
          </p>
        </div>
        <p className="text-sm leading-7 text-forest-600">{product.story}</p>
        <div className="flex flex-wrap gap-2">
          {product.materials.map((material) => (
            <span key={material} className="rounded-full border border-forest-100 bg-white px-3 py-1 text-xs text-forest-600">
              {material}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/catalogue/${product.slug}`} className="button-lift rounded-full bg-forest-900 px-4 py-2 text-sm text-sand-50">
            {locale === "en" ? "View piece" : "Lihat karya"}
          </Link>
          <button type="button" onClick={() => addToCart(product.slug)} className="button-lift rounded-full border border-forest-200 px-4 py-2 text-sm text-forest-700">
            {dict.common.addToCart}
          </button>
          <button type="button" onClick={() => openPreview(product.slug)} className="button-lift inline-flex items-center gap-2 rounded-full border border-forest-200 px-4 py-2 text-sm text-forest-700">
            <Eye className="h-4 w-4" />
            {locale === "en" ? "Quick preview" : "Preview cepat"}
          </button>
        </div>
      </div>
    </article>
  );
}
