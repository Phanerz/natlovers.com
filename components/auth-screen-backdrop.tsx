import Image from "next/image";
import {ReactNode} from "react";

const BACKGROUND_IMAGE_URL = "https://ftw7p3nsw06ehaup.public.blob.vercel-storage.com/natlovers-background.png";

// Shared chrome for both sign-in screens (admin and customer). A single
// object-cover layer, not the earlier blurred-fill + sharp-contain stack:
// contain left bare blurred strips on either side whenever the viewport
// ratio didn't match the photo, which read as a mistake rather than depth.
// Cover always fills edge to edge at any viewport size with no letterboxing;
// the object-position is tuned toward where the bag actually sits in the
// source photo (right of center, full height) so cropping on narrow/tall
// viewports trims the empty left side first, not the bag itself. The extra
// scale is headroom so the blur filter's own edge softening never peeks
// past the section bounds.
export function AuthScreenBackdrop({children}: {children: ReactNode}) {
  return (
    <section
      className="page-enter relative w-full overflow-hidden"
      style={{minHeight: "calc(100svh - var(--header-height))"}}
    >
      <div className="absolute inset-0 bg-[#07120d]" />
      <Image
        src={BACKGROUND_IMAGE_URL}
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-110 object-cover blur-sm"
        style={{objectPosition: "72% 42%"}}
      />
      <div className="absolute inset-0 bg-[#06110b]/50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_28%,rgba(115,155,134,0.2),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(232,221,190,0.1),transparent_18%),linear-gradient(180deg,rgba(6,17,11,0.5),rgba(6,17,11,0.24)_42%,rgba(6,17,11,0.56)_100%)]" />

      <div className="absolute inset-0 z-10 flex items-center justify-center px-4 py-16 sm:px-6">
        {children}
      </div>
    </section>
  );
}
