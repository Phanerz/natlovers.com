import {Suspense} from "react";
import {CatalogueContent} from "@/app/catalogue/CatalogueClient";
import {getAllProducts} from "@/lib/admin-products";
import {getActiveBanners} from "@/lib/admin-catalogue-banners";

// Live catalogue data (price, stock, availability)  -  never served from the
// Full Route Cache, matching /api/admin/products' own no-store intent.
export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  // A banner lookup that fails must never take the catalogue down with it.
  const [products, banners] = await Promise.all([getAllProducts(), getActiveBanners().catch(() => [])]);

  return (
    <main className="page-enter">
      <Suspense fallback={null}>
        <CatalogueContent initialProducts={products} initialBanners={banners} />
      </Suspense>
    </main>
  );
}
