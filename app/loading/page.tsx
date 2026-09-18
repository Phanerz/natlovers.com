import {DaisyLoader} from "@/components/daisy-loader";

// A real routable page at /loading (this file lives at app/loading/page.tsx,
// a folder named "loading" with its own page - not app/loading.tsx, the
// special Suspense-fallback file that already exists one level up and
// covers the rest of the site). Personal viewer only, not linked from any
// site navigation: a permanent way to look at the daisy loader on demand
// instead of catching it mid-flight during a real page transition. Light/
// dark follows the same .dark class the rest of the site already uses.
export const metadata = {
  robots: {index: false, follow: false}
};

export default function LoadingPreviewPage() {
  return (
    <div className="flex flex-col">
      <DaisyLoader />
      <DaisyLoader variant="admin" text="Loading dashboard..." />
    </div>
  );
}
