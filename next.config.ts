import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
    // The public catalogue/hero-card/testimonial data all comes from a
    // client-side fetch inside a useEffect that only runs once per mount.
    // Next's Client Router Cache was reusing the already-rendered page tree
    // on soft navigation (its default staleTime is 5 minutes for a static
    // segment like /catalogue), so that effect never re-ran and admin edits
    // stayed invisible until a hard reload or the cache aged out. Zeroing
    // both staleTimes means every navigation back to these pages remounts
    // fresh and refetches, matching what a hard refresh already did. 30 is
    // the framework's enforced minimum for "static" (0 is rejected at
    // startup), still a massive drop from the 5-minute default.
    staleTimes: {
      dynamic: 0,
      static: 30
    }
  },
  // The Custom Studio was removed. Anyone with an old link (an Instagram bio, a saved bookmark)
  // lands on the catalogue instead of an error page. Temporary redirects, so a page can be
  // brought back at one of these addresses later without browsers remembering the redirect.
  async redirects() {
    return [
      {source: "/custom", destination: "/catalogue", permanent: false},
      {source: "/custom/:path*", destination: "/catalogue", permanent: false},
      {source: "/mimin/custom-requests", destination: "/mimin", permanent: false},
      {source: "/mimin/custom-requests/:path*", destination: "/mimin", permanent: false}
    ];
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
