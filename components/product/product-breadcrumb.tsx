"use client";

import Link from "next/link";
import {ChevronRight} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {productTypeLabels, type ShopProductType} from "@/app/catalogue/shop-data";

export function ProductBreadcrumb({productType, productName}: {productType: ShopProductType; productName: string}) {
  const {locale} = useSitePreferences();

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-2 text-sm font-medium tracking-[0.08em] text-forest-700"
    >
      <Link href="/" className="transition-colors duration-200 hover:text-forest-900">
        {locale === "en" ? "Home" : "Beranda"}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-forest-300" />
      <Link
        href={`/catalogue?type=${encodeURIComponent(productType)}`}
        className="transition-colors duration-200 hover:text-forest-900"
      >
        {productTypeLabels[productType][locale]}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-forest-300" />
      <span className="text-forest-900">{productName}</span>
    </nav>
  );
}
