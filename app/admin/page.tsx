"use client";

import {useEffect, useState} from "react";
import {PlusCircle, Trash2} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";

export default function AdminPage() {
  const {locale} = useSitePreferences();
  const {getProducts, updateProduct, addProduct, removeProductEntry} = useStorefront();
  const products = getProducts(locale);
  const [highlightSlug, setHighlightSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!highlightSlug) {
      return;
    }

    const timeout = window.setTimeout(() => setHighlightSlug(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [highlightSlug]);

  return (
    <main className="shell py-16 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="muted">Studio Control</p>
          <h1 className="mt-3 font-display text-4xl text-forest-900">Edit products directly from the browser.</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-forest-700">
            Temporary build-mode editor for Natlovers. Product changes are saved locally in this browser while we finish the full admin system.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHighlightSlug(addProduct(locale))}
          className="button-lift inline-flex items-center gap-2 rounded-full bg-forest-900 px-5 py-3 text-sm font-semibold text-sand-50"
        >
          <PlusCircle className="h-4 w-4" />
          Add new product
        </button>
      </div>

      <div className="grid gap-6">
        {products.map((product) => (
          <section
            key={product.slug}
            className={`card p-6 transition-all ${highlightSlug === product.slug ? "ring-2 ring-forest-500/40" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="muted">{product.slug}</p>
                <h2 className="mt-2 font-display text-3xl text-forest-900">{product.title}</h2>
                <p className="mt-2 text-sm text-forest-600">Autosaves instantly in your current browser.</p>
              </div>
              <button
                type="button"
                onClick={() => removeProductEntry(locale, product.slug)}
                className="button-lift inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2 text-sm text-forest-700">
                Product name
                <input
                  value={product.title}
                  onChange={(event) => updateProduct(locale, product.slug, {title: event.target.value})}
                  className="rounded-[1rem] border border-forest-100 bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-forest-700">
                Price in IDR
                <input
                  type="number"
                  value={product.priceIdr}
                  onChange={(event) => updateProduct(locale, product.slug, {priceIdr: Number(event.target.value) || 0})}
                  className="rounded-[1rem] border border-forest-100 bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-forest-700 lg:col-span-2">
                Image URL
                <input
                  value={product.imageUrl}
                  onChange={(event) => updateProduct(locale, product.slug, {imageUrl: event.target.value})}
                  className="rounded-[1rem] border border-forest-100 bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-forest-700 lg:col-span-2">
                Short description
                <textarea
                  value={product.description}
                  onChange={(event) => updateProduct(locale, product.slug, {description: event.target.value})}
                  className="min-h-28 rounded-[1rem] border border-forest-100 bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-forest-700 lg:col-span-2">
                Story / detail paragraph
                <textarea
                  value={product.story}
                  onChange={(event) => updateProduct(locale, product.slug, {story: event.target.value})}
                  className="min-h-32 rounded-[1rem] border border-forest-100 bg-white/70 px-4 py-3 outline-none"
                />
              </label>
              <label className="grid gap-2 text-sm text-forest-700 lg:col-span-2">
                Materials / tags
                <input
                  value={product.materials.join(", ")}
                  onChange={(event) => updateProduct(locale, product.slug, {materials: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)})}
                  className="rounded-[1rem] border border-forest-100 bg-white/70 px-4 py-3 outline-none"
                />
              </label>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

