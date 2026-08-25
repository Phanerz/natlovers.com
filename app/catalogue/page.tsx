import {Suspense} from "react";
import {CatalogueContent} from "@/app/catalogue/CatalogueClient";
import {getAllProducts} from "@/lib/admin-products";

// Live catalogue data (price, stock, availability) — never served from the
// Full Route Cache, matching /api/admin/products' own no-store intent.
export const dynamic = "force-dynamic";

export default async function CataloguePage() {
  const products = await getAllProducts();

  return (
    <main className="page-enter">
      <Suspense fallback={null}>
        <CatalogueContent initialProducts={products} />
      </Suspense>
    </main>
  );
}
