import {DaisyLoader} from "@/components/daisy-loader";

// A real routable page at /loading (app/loading/page.tsx, a folder named
// "loading" with its own page, not app/loading.tsx, the special Suspense-
// fallback file one level up). Personal viewer only, not linked from any site
// navigation: one full-screen loader, exactly as it appears mid-navigation.
// /loading?variant=admin shows the plain admin version instead. Light/dark
// follows the same .dark class the rest of the site uses.
export const metadata = {
  robots: {index: false, follow: false}
};

export default async function LoadingPreviewPage({
  searchParams
}: {
  searchParams: Promise<{variant?: string}>;
}) {
  const {variant} = await searchParams;

  return variant === "admin" ? <DaisyLoader variant="admin" text="Loading dashboard..." /> : <DaisyLoader />;
}
