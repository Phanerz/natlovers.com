import {Eye} from "lucide-react";

// Shown only on /catalogue/[slug]?preview=1, and only ever reachable by an
// admin session (see the auth check in app/catalogue/[slug]/page.tsx) - a
// customer can never land here, but the banner still makes it unambiguous
// this isn't the live page, including when it's showing unsaved draft
// edits rather than what's actually published.
export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-forest-900 px-4 py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] text-sand-50">
      <Eye className="h-3.5 w-3.5" />
      Previewing draft - not visible to customers
    </div>
  );
}
