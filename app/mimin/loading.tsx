import {DaisyLoader} from "@/components/daisy-loader";

// Overrides the root app/loading.tsx for every /mimin/* route  -  this one
// covers the layout's own getSession() await too, since loading.tsx wraps
// the whole segment subtree, not just this page.
export default function Loading() {
  return <DaisyLoader variant="admin" text="Loading dashboard..." />;
}
