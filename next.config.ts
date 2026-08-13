import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
    // The public catalogue/hero-card/testimonial data all comes from a
    // client-side fetch inside a useEffect that only runs once per mount —
    // Next's Client Router Cache was reusing the already-rendered page tree
    // on soft navigation (its default staleTime is 5 minutes for a static
    // segment like /catalogue), so that effect never re-ran and admin edits
    // stayed invisible until a hard reload or the cache aged out. Zeroing
    // both staleTimes means every navigation back to these pages remounts
    // fresh and refetches, matching what a hard refresh already did.
    staleTimes: {
      dynamic: 0,
      static: 0
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com"
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com"
      }
    ]
  }
};

export default nextConfig;
