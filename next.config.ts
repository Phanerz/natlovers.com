import type {NextConfig} from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true
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
