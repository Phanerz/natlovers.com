import Link from "next/link";
import Image from "next/image";

// Deliberately minimal  -  no cart, search, or nav-pill logic, since those are
// exactly the kind of client-side complexity that could have caused the
// real header to crash in the first place. Just enough that a visitor can
// still get back to the homepage and see the catalogue link while the rest
// of the page (wrapped separately) keeps working normally.
export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-40 flex min-h-[var(--header-height)] items-center justify-between bg-forest-900/95 px-4 text-sand-50 sm:px-6">
      <Link href="/" aria-label="Go to Natlovers homepage" className="flex items-center">
        <Image
          src="/natlovers-logo.avif"
          alt="Natlovers logo"
          width={220}
          height={62}
          className="h-auto w-[180px] object-contain sm:w-[220px]"
          priority
        />
      </Link>
      <Link href="/catalogue" className="text-sm font-medium underline underline-offset-4">
        Catalogue
      </Link>
    </header>
  );
}
