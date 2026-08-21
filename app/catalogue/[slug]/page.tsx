import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getProductBySlug} from "@/lib/admin-products";
import {materialImageStyle, DEFAULT_IMAGE_STYLE, type ShopProductType} from "@/app/catalogue/shop-data";
import {ProductBreadcrumb} from "@/components/product/product-breadcrumb";
import {ProductGallery} from "@/components/product/product-gallery";
import {ProductPurchasePanel} from "@/components/product/product-purchase-panel";
import {ProductInfoSection} from "@/components/product/product-info-section";
import {ReassuranceBar} from "@/components/product/reassurance-bar";

// Live catalogue data (price, stock, images) — never served from the Full
// Route Cache, same reasoning as /api/admin/products.
export const dynamic = "force-dynamic";

export async function generateMetadata({params}: {params: Promise<{slug: string}>}): Promise<Metadata> {
  const {slug} = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return {title: "Product not found"};
  }
  return {
    title: `${product.name} — Natlovers`,
    description: product.description?.trim() || `${product.name}, handcrafted in Indonesia.`
  };
}

export default async function ProductPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  const product = await getProductBySlug(slug);

  // A deactivated or missing product 404s outright — a sold-out product
  // still gets a full page (the purchase panel just shows a disabled
  // "Sold Out" state), since sold-out and deactivated mean different things.
  if (!product) {
    notFound();
  }

  const images = product.images.length ? product.images : [product.imageUrl].filter(Boolean);
  const tint = (product.materials[0] ? materialImageStyle[product.materials[0]] : null) ?? DEFAULT_IMAGE_STYLE;

  return (
    <main className="shell page-enter py-10 sm:py-14">
      <ProductBreadcrumb productType={product.productType as ShopProductType} productName={product.name} />

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[34px] xl:gap-[55px]">
        <ProductGallery images={images} name={product.name} tintHex={tint.bg} />
        <ProductPurchasePanel product={product} />
      </div>

      <ProductInfoSection product={product} />

      <div className="mt-8">
        <ReassuranceBar />
      </div>
    </main>
  );
}
