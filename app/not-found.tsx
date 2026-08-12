"use client";

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

export default function NotFound() {
  const {locale} = useSitePreferences();

  return (
    <main className="page-enter flex min-h-[70vh] items-center justify-center px-4 py-20">
      <div className="flex max-w-md flex-col items-center text-center">
        <Sprig />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-forest-500">
          {locale === "en" ? "Dictionary entry / Page not found" : "Entri kamus / Halaman tidak ditemukan"}
        </p>
        <h1 className="mt-3 font-display text-[clamp(3.5rem,10vw,5.5rem)] leading-none text-forest-900">404</h1>
        <p className="mt-5 text-base leading-7 text-forest-600">
          {locale === "en"
            ? "This page wandered off the shelf. The piece you're looking for may have been moved, sold, or never existed."
            : "Halaman ini tidak ditemukan di rak. Karya yang Anda cari mungkin telah dipindahkan, terjual, atau tidak pernah ada."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="button-lift rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-sand-50">
            {locale === "en" ? "Back to Home" : "Kembali ke Beranda"}
          </Link>
          <Link
            href="/catalogue"
            className="button-lift rounded-full border border-forest-300 px-6 py-3 text-sm font-semibold text-forest-700"
          >
            {locale === "en" ? "Browse the Catalogue" : "Jelajahi Katalog"}
          </Link>
        </div>
      </div>
    </main>
  );
}
