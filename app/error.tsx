"use client";

import {useEffect} from "react";
import Link from "next/link";
import {useSitePreferences} from "@/components/site-preferences-provider";

function Sprig() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-14 w-14 shrink-0 text-[#8a9a7c]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M32 58 C30 44 34 30 30 14" />
      <path d="M30 14 C24 16 18 14 14 8" />
      <path d="M30 14 C36 12 40 6 40 2" />
      <path d="M31 30 C25 30 20 26 18 22" />
      <path d="M31 30 C37 28 41 24 42 20" />
      <path d="M31 44 C26 45 22 42 20 38" />
      <path d="M31 44 C36 43 40 40 41 36" />
    </svg>
  );
}

export default function ErrorBoundary({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  const {locale} = useSitePreferences();

  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <main className="page-enter flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="flex max-w-md flex-col items-center text-center">
        <Sprig />
        <h1 className="mt-6 font-display text-4xl leading-tight text-forest-900 sm:text-5xl">
          {locale === "en" ? "A stitch came loose" : "Ada yang tidak beres"}
        </h1>
        <p className="mt-5 text-base leading-7 text-forest-600">
          {locale === "en"
            ? "Something unexpected happened while loading this page. Please try again, or head back home."
            : "Terjadi kesalahan tak terduga saat memuat halaman ini. Silakan coba lagi, atau kembali ke beranda."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="glass-btn-primary rounded-full px-6 py-3 text-sm font-semibold text-sand-50"
          >
            {locale === "en" ? "Try Again" : "Coba Lagi"}
          </button>
          <Link href="/" className="glass-btn-secondary rounded-full px-6 py-3 text-sm font-semibold text-forest-700">
            {locale === "en" ? "Back to Home" : "Kembali ke Beranda"}
          </Link>
        </div>
      </div>
    </main>
  );
}
