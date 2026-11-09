"use client";

import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {ChevronLeft, ChevronRight, Maximize2, X} from "lucide-react";
import {ImageWithFallback} from "@/components/image-with-fallback";
import {useLoopingTrack} from "@/components/use-looping-track";

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

  // Rendered into <body>: the page content animates in with a transform, which
  // would make a "fixed" viewer size itself to the page and sit off-screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${name} image viewer`}
      className="pdp-lightbox backdrop-blur-[14px]"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Close image viewer"
        className="pdp-zoom pdp-lightbox-close"
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
            className="pdp-zoom pdp-lightbox-arrow pdp-lightbox-prev"
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
            className="pdp-zoom pdp-lightbox-arrow pdp-lightbox-next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      <div className="pdp-lightbox-stage" onClick={(event) => event.stopPropagation()}>
        {images[index] ? (
          <ImageWithFallback
            key={images[index]}
            src={images[index]}
            alt={`${name} ${index + 1}`}
            fill
            sizes="90vw"
            className="pdp-lightbox-image object-contain"
          />
        ) : null}
      </div>

      {images.length > 1 ? (
        <p className="pdp-lightbox-count" aria-live="polite">
          {index + 1} / {images.length}
        </p>
      ) : null}
    </div>,
    document.body
  );
}

// How many places apart two photographs are on the endless loop.
function swipeDistance(index: number, active: number, count: number) {
  const real = ((index % count) + count) % count;
  const gap = Math.abs(real - active);
  return Math.min(gap, count - gap);
}

export function ProductGallery({
  images,
  name,
  tintHex,
  zoomEnabled = true
}: {
  images: string[];
  name: string;
  tintHex: string;
  zoomEnabled?: boolean;
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [imgOpacity, setImgOpacity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fadeTimeoutRef = useRef<number | null>(null);
  // Phones: no thumbnails, just a swipeable strip that loops round in both directions.
  const swipe = useLoopingTrack(images.length, setActiveImage);
  const {showInstantly} = swipe;
  useEffect(() => {
    if (!lightboxOpen) showInstantly(activeImage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen]);

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
    <div className="pdp-gallery flex flex-col gap-4 lg:flex-row">
      {images.length > 1 ? (
        // Horizontal strip on mobile, vertical scrollable rail on desktop  - 
        // real DB order (array order), no reordering.
        // Every photo shown whole in an equal square, never a side scroll: a
        // wrapping grid on phones, and on desktop a rail exactly as tall as the
        // main photo (its own height never stretches the row).
        <div className="pdp-thumbs order-2 max-sm:hidden lg:order-1">
          <div className="pdp-thumbs-inner">
            {images.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                aria-label={`${name} image ${index + 1}`}
                aria-current={index === activeImage}
                onClick={() => selectImage(index)}
                className="pdp-thumb"
              >
                <ImageWithFallback src={url} alt={`${name} ${index + 1}`} fill sizes="84px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="pdp-main relative order-1 aspect-[3/4] w-full overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] max-sm:hidden lg:order-2"
        style={{backgroundColor: tintHex}}
      >
        {images[activeImage] ? (
          zoomEnabled ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Expand image"
              className="absolute inset-0 h-full w-full cursor-zoom-in"
              style={{opacity: imgOpacity, transition: "opacity 180ms ease"}}
            >
              <ImageWithFallback
                src={images[activeImage]}
                alt={name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            </button>
          ) : (
            <div className="absolute inset-0 h-full w-full" style={{opacity: imgOpacity, transition: "opacity 180ms ease"}}>
              <ImageWithFallback
                src={images[activeImage]}
                alt={name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
            </div>
          )
        ) : null}

        {zoomEnabled ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="View full image"
            className="pdp-zoom absolute right-3 top-3 backdrop-blur-[6px]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div
        className="pdp-swipe relative hidden aspect-square w-full overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] max-sm:block"
        style={{backgroundColor: tintHex}}
      >
        <div
          ref={swipe.trackRef}
          className="pdp-swipe-track"
          onScroll={swipe.onScroll}
          onTouchStart={swipe.touchHandlers.onTouchStart}
          onTouchEnd={swipe.touchHandlers.onTouchEnd}
          onTouchCancel={swipe.touchHandlers.onTouchCancel}
        >
          {(swipe.loop ? [images[images.length - 1], ...images, images[0]] : images).map((url, position) => {
            const index = swipe.loop ? position - 1 : position;
            // Every phone picture sits in a square. A photograph that is not square is shown whole,
            // and the space beside it is filled with a soft blur of the same photograph, so it blends in
            // and nothing is cut off.
            const near = swipeDistance(index, activeImage, images.length) <= 2;
            const picture = (
              <>
                <div className="pdp-swipe-blur" aria-hidden>
                  <ImageWithFallback src={url} alt="" fill sizes="48px" className="object-cover" />
                </div>
                <ImageWithFallback
                  src={url}
                  alt={name}
                  fill
                  priority={index === 0 && position === (swipe.loop ? 1 : 0)}
                  loading={near ? "eager" : "lazy"}
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-contain"
                />
              </>
            );
            return zoomEnabled ? (
              <button
                key={`${position}-${url}`}
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Expand image"
                className="pdp-swipe-slide"
              >
                {picture}
              </button>
            ) : (
              <div key={`${position}-${url}`} className="pdp-swipe-slide">
                {picture}
              </div>
            );
          })}
        </div>
        {images.length > 1 ? (
          <div className="pdp-swipe-dots" aria-hidden>
            {images.map((url, index) => (
              <span key={`${url}-${index}`} className={index === activeImage ? "is-active" : undefined} />
            ))}
          </div>
        ) : null}
        {zoomEnabled ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="View full image"
            className="pdp-zoom absolute right-3 top-3 backdrop-blur-[6px]"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        ) : null}
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
