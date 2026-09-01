import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getProductBySlug, getProductForPreview} from "@/lib/admin-products";
import {getSession, isAdminEmail} from "@/lib/auth";
import {materialImageStyle, DEFAULT_IMAGE_STYLE, type ShopProductType} from "@/app/catalogue/shop-data";
import {ProductBreadcrumb} from "@/components/product/product-breadcrumb";
import {ProductGallery} from "@/components/product/product-gallery";
import {ProductPurchasePanel} from "@/components/product/product-purchase-panel";
import {ProductInfoSection} from "@/components/product/product-info-section";
import {ProductTrustBadges} from "@/components/product/product-trust-badges";
import {PreviewBanner} from "@/components/product/preview-banner";
import {ReassuranceBar} from "@/components/product/reassurance-bar";

// Live catalogue data (price, stock, images)  -  never served from the Full
// Route Cache, same reasoning as /api/admin/products.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{slug: string}>;
  searchParams: Promise<{preview?: string}>;
}): Promise<Metadata> {
  const {slug} = await params;
  const {preview} = await searchParams;

  // Same admin-only gate as the page component below  -  a search-engine
  // crawler or signed-out visitor hitting ?preview=1 must still only ever
  // see the real, published metadata.
  let product = null;
  if (preview === "1") {
    const session = await getSession();
    if (isAdminEmail(session?.user?.email)) {
      product = await getProductForPreview(slug);
    }
  }
  product ??= await getProductBySlug(slug);

  if (!product) {
    return {title: "Product not found"};
  }
  // metaTitle/metaDescription are the admin's SEO-card overrides; falling
  // back to shortDescription (guaranteed plain text) rather than the rich
  // `description` field, which can hold HTML that has no business landing
  // in a <meta> tag.
  return {
    title: product.metaTitle?.trim() || `${product.name} - Natlovers`,
    description: product.metaDescription?.trim() || product.shortDescription?.trim() || `${product.name}, handcrafted in Indonesia.`
  };
}

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{slug: string}>;
  searchParams: Promise<{preview?: string}>;
}) {
  const {slug} = await params;
  const {preview} = await searchParams;

  // ?preview=1 is admin-only - it bypasses the isActive gate below (so a
  // draft/archived product is still previewable) and
  // overlays any staged draftData, so it must never be reachable by a
  // signed-out visitor or a non-admin account. A non-admin hitting this
  // URL just gets the normal public lookup, not an error that would
  // confirm the product exists in some other state.
  const isPreview = preview === "1";
  let isAdminPreview = false;
  if (isPreview) {
    const session = await getSession();
    isAdminPreview = isAdminEmail(session?.user?.email);
  }

  const product = isAdminPreview ? await getProductForPreview(slug) : await getProductBySlug(slug);

  // A deactivated or missing product 404s outright  -  a sold-out product
  // still gets a full page (the purchase panel just shows a disabled
  // "Sold Out" state), since sold-out and deactivated mean different things.
  if (!product) {
    notFound();
  }

  const images = product.images.length ? product.images : [product.imageUrl].filter(Boolean);
  const tint = (product.materials[0] ? materialImageStyle[product.materials[0]] : null) ?? DEFAULT_IMAGE_STYLE;

  return (
    <main className="shell page-enter py-10 sm:py-14">
      {isAdminPreview ? <PreviewBanner /> : null}
      <ProductBreadcrumb productType={product.productType as ShopProductType} productName={product.name} />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[30px] xl:gap-[48px]">
        <div>
          <ProductGallery images={images} name={product.name} tintHex={tint.bg} zoomEnabled={product.imageZoomEnabled} />
          <ProductTrustBadges />
        </div>
        <ProductPurchasePanel product={product} />
      </div>

      <ProductInfoSection product={product} />

      <div className="mt-8">
        <ReassuranceBar />
      </div>
    </main>
  );
}
