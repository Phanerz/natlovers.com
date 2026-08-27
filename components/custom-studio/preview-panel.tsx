"use client";

import Image from "next/image";
import {useEffect, useMemo, useState} from "react";
import {ChevronLeft, ChevronRight, ImageOff, Info, Maximize2, X} from "lucide-react";
import {describePreviewMatch, findPreviewMatch, type PreviewCatalogue} from "@/lib/custom-preview";
import {colourHex, customTypeNoun, type CustomConfig} from "@/lib/custom-studio";

// The centre column. It shows real photographs of real products, chosen by
// how closely their recorded attributes match what is being configured, and
// it always says out loud how close that match is. There is no compositing
// and no generated imagery  -  a customer looking at this panel is looking at
// something the workshop has actually made.

export function PreviewPanel({config, catalogue}: {config: CustomConfig; catalogue: PreviewCatalogue}) {
  const match = useMemo(() => findPreviewMatch(config, catalogue), [config, catalogue]);
  const images = match.product?.images ?? [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // A different product may have a different number of angles, so the
  // selected angle is clamped rather than left pointing past the end.
  useEffect(() => {
    setActiveIndex((current) => (current < images.length ? current : 0));
  }, [images.length]);

  useEffect(() => {
    if (!lightboxOpen) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const noun = customTypeNoun[config.productType];
  const caption = describePreviewMatch(match, noun);
  const activeImage = images[activeIndex];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative flex-1 overflow-hidden rounded-xl border border-[#e0d8c7] bg-[#f0ebdf]">
        {activeImage ? (
          <>
            <Image
              key={activeImage}
              src={activeImage}
              alt={`${match.product?.name ?? "Reference piece"}  -  angle ${activeIndex + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
              priority
            />
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="button-lift absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/85 px-3.5 py-2 text-[11px] font-medium text-forest-800 backdrop-blur"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              View full size
            </button>
          </>
        ) : (
          // Rendered whenever the catalogue holds no photographed product of
          // this type. Showing an unrelated picture would be worse than
          // showing none, so this states the situation instead.
          <div className="flex h-full flex-col items-center justify-center gap-3 px-10 text-center">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full border border-[#d6ccb8]"
              style={{backgroundColor: "colour" in config ? colourHex(config.colour) : "#EFE3CE"}}
            >
              <ImageOff className="h-6 w-6 text-forest-500" />
            </span>
            <p className="font-display text-lg text-forest-900">No reference photography yet</p>
            <p className="max-w-sm text-sm leading-relaxed text-forest-600">
              We haven&apos;t photographed a custom {noun} for the catalogue yet. Your configuration is still recorded in
              full, and the studio will send visual references once they&apos;ve reviewed your request.
            </p>
          </div>
        )}
      </div>

      {/* Angle thumbnails, shown only when the matched product genuinely has
          more than one photograph  -  never padded out with placeholders. */}
      {images.length > 1 ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveIndex((current) => (current - 1 + images.length) % images.length)}
            aria-label="Previous angle"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ddd5c4] bg-[#fffdf9] text-forest-700 transition-colors hover:border-forest-400"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex flex-1 gap-2 overflow-x-auto">
            {images.map((image, index) => (
              <button
                key={image}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Angle ${index + 1}`}
                aria-pressed={index === activeIndex}
                className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border transition-all duration-200 ${
                  index === activeIndex ? "border-forest-700 ring-1 ring-forest-700" : "border-[#ddd5c4] opacity-75 hover:opacity-100"
                }`}
              >
                <Image src={image} alt="" fill sizes="80px" className="object-cover" />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setActiveIndex((current) => (current + 1) % images.length)}
            aria-label="Next angle"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#ddd5c4] bg-[#fffdf9] text-forest-700 transition-colors hover:border-forest-400"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {/* The empty-state panel above already explains why there is no
          photograph, so repeating the caption underneath would say the same
          thing twice. */}
      {match.quality !== "none" ? (
        <p className="flex items-start gap-2 rounded-xl border border-[#e4dcc9] bg-[#faf6ec] px-3.5 py-2.5 text-[11px] leading-relaxed text-forest-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-500" />
          <span>{caption}</span>
        </p>
      ) : null}

      {lightboxOpen && activeImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full size preview"
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-forest-900/85 p-6 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sand-50"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-[80vh] w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <Image src={activeImage} alt={match.product?.name ?? ""} fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
