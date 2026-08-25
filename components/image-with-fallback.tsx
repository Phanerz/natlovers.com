"use client";

import Image, {ImageProps} from "next/image";
import {useState} from "react";
import {ImageOff} from "lucide-react";

// Product images live on Vercel Blob storage — a deleted/moved blob 404s,
// and next/image has no built-in fallback for that (it just renders the
// browser's broken-image icon). This swaps to a plain placeholder instead,
// so a missing image reads as "no photo available" rather than as a bug.
// Scoped to the customer-facing surfaces most visible to a shopper (product
// cards, product gallery) — see the mobile-performance audit for the full
// inventory of the other 20+ <Image> usages this doesn't yet cover.
export function ImageWithFallback(props: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ImageOff className="h-8 w-8 text-forest-400/60" aria-hidden />
      </div>
    );
  }

  return <Image {...props} onError={() => setFailed(true)} />;
}
