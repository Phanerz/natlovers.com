"use client";

import {useEffect, useRef, useState} from "react";
import Image from "next/image";
import {ChevronLeft, ChevronRight, Maximize2, X} from "lucide-react";

function Lightbox({
  images,
  index,
  name,
  onIndexChange,
  onClose
}: {
  images: string[];
  index: number;
  name: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight" && images.length > 1) {
        onIndexChange((index + 1) % images.length);
      } else if (event.key === "ArrowLeft" && images.length > 1) {
        onIndexChange((index - 1 + images.length) % images.length);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, images.length, onIndexChange, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} image viewer`}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close image viewer"
        className="liquid-glass icon-button absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-[#fff7e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="h-5 w-5" />
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index - 1 + images.length) % images.length);
            }}
            aria-label="Previous image"
            className="liquid-glass icon-button absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#fff7e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIndexChange((index + 1) % images.length);
            }}
            aria-label="Next image"
            className="liquid-glass icon-button absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#fff7e5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      <div className="relative h-[80vh] w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
        {images[index] ? (
          <Image src={images[index]} alt={`${name} ${index + 1}`} fill sizes="90vw" className="object-contain" />
        ) : null}
      </div>
    </div>
  );
}

export function ProductGallery({images, name, tintHex}: {images: string[]; name: string; tintHex: string}) {
  const [activeImage, setActiveImage] = useState(0);
  const [imgOpacity, setImgOpacity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    },
    []
  );

  function selectImage(index: number) {
    if (index === activeImage) {
      return;
    }
    setImgOpacity(0);
    fadeTimeoutRef.current = window.setTimeout(() => {
      setActiveImage(index);
      setImgOpacity(1);
    }, 90);
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {images.length > 1 ? (
        // Horizontal strip on mobile, vertical scrollable rail on desktop —
        // real DB order (array order), no reordering.
        <div className="order-2 flex max-h-none gap-3 overflow-x-auto pb-1 lg:order-1 lg:h-[520px] lg:w-20 lg:shrink-0 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:pb-0">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              aria-label={`${name} image ${index + 1}`}
              aria-current={index === activeImage}
              onClick={() => selectImage(index)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 lg:h-20 lg:w-20 ${
                index === activeImage ? "ring-2 ring-forest-900" : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={url} alt={`${name} ${index + 1}`} fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="relative order-1 aspect-[4/5] w-full overflow-hidden rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.06)] lg:order-2"
        style={{backgroundColor: tintHex}}
      >
        {images[activeImage] ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Expand image"
            className="absolute inset-0 h-full w-full cursor-zoom-in"
            style={{opacity: imgOpacity, transition: "opacity 180ms ease"}}
          >
            <Image
              src={images[activeImage]}
              alt={name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label="View full image"
          className="liquid-glass-on-light icon-button absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-forest-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {lightboxOpen ? (
        <Lightbox
          images={images}
          index={activeImage}
          name={name}
          onIndexChange={setActiveImage}
          onClose={() => setLightboxOpen(false)}
        />
      ) : null}
    </div>
  );
}
