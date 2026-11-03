import Image from "next/image";
import Link from "next/link";
import type {Route} from "next";
import type {PublicBanner} from "@/lib/catalogue-banners";

// An editorial collection feature set between products in the catalogue grid.
// The same component is used by the admin preview, so what an admin sees there
// is exactly what a customer gets. All visuals live in .catalogue-banner* in
// globals.css (it fills whatever grid area it is given on desktop, and takes a
// fixed editorial proportion when it spans the full width on a phone).
export function CatalogueBanner({
  banner,
  priority = false,
  // "grid": fills the grid area it spans (desktop). "feature": a full-width
  // editorial block with a fixed proportion (phone). "feature-narrow": the same
  // in a single phone column.
  layout = "grid",
  // Admin preview only: shows a picked-but-not-yet-uploaded image.
  imageOverride
}: {
  banner: Pick<
    PublicBanner,
    "eyebrow" | "title" | "description" | "imageUrl" | "ctaLabel" | "destinationUrl" | "overlay"
  >;
  priority?: boolean;
  layout?: "grid" | "feature" | "feature-narrow";
  imageOverride?: string | null;
}) {
  const src = imageOverride ?? banner.imageUrl;
  const body = (
    <>
      {src ? (
        imageOverride ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="catalogue-banner-image" />
        ) : (
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 50vw"
            priority={priority}
            className="catalogue-banner-image"
          />
        )
      ) : null}
      <div className="catalogue-banner-wash" aria-hidden />
      <div className="catalogue-banner-copy">
        {banner.eyebrow ? <p className="catalogue-banner-eyebrow">{banner.eyebrow}</p> : null}
        <h2 className="catalogue-banner-title">{banner.title}</h2>
        {banner.description ? <p className="catalogue-banner-description">{banner.description}</p> : null}
        {banner.ctaLabel && banner.destinationUrl ? <span className="catalogue-banner-cta">{banner.ctaLabel}</span> : null}
      </div>
    </>
  );

  const className = "catalogue-banner";
  const isExternal = banner.destinationUrl ? !banner.destinationUrl.startsWith("/") : false;

  if (banner.destinationUrl) {
    return isExternal ? (
      <a
        href={banner.destinationUrl}
        className={className}
        data-overlay={banner.overlay}
        data-layout={layout}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={banner.title}
      >
        {body}
      </a>
    ) : (
      <Link
        href={banner.destinationUrl as Route}
        className={className}
        data-overlay={banner.overlay}
        data-layout={layout}
        aria-label={banner.title}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={className} data-overlay={banner.overlay} data-layout={layout} role="group" aria-label={banner.title}>
      {body}
    </div>
  );
}
