"use client";

import {useLayoutEffect, useRef, useState} from "react";
import {Play} from "lucide-react";

const VIDEO_ID = "Eycy2uM9OJs";
const SETTLE_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SETTLE_DURATION = 800;

// FLIP entrance: snap to a viewport-covering transform, then transition back
// to identity — avoids position:fixed since the section is already screen-centered.
// Scale is uniform (like object-fit: cover), not independent X/Y stretch: on
// tall/narrow ratios (mobile portrait especially) the height-to-cover factor
// can run 3x+ the width factor, and stretching non-uniformly to hit both
// visibly distorts the video. Netflix's own expand transitions never stretch
// content either — they scale uniformly and let the excess overflow/crop,
// which viewport overflow-x:clip (and .snap-page's overflow-y on desktop)
// already handles for us.
function playIntro(card: HTMLDivElement, section: HTMLDivElement) {
  const finalRect = card.getBoundingClientRect();
  const sectionRect = section.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;

  const fromCenterX = viewportWidth / 2;
  const fromCenterY = sectionRect.top + sectionRect.height / 2;
  const finalCenterX = finalRect.left + finalRect.width / 2;
  const finalCenterY = finalRect.top + finalRect.height / 2;

  const scale = Math.max(viewportWidth / finalRect.width, sectionRect.height / finalRect.height);
  const translateX = fromCenterX - finalCenterX;
  const translateY = fromCenterY - finalCenterY;

  card.style.transition = "none";
  card.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  card.style.borderRadius = "0px";

  // Force a reflow so the "from" transform commits before animating away from it.
  void card.offsetHeight;

  requestAnimationFrame(() => {
    card.style.transition = `transform ${SETTLE_DURATION}ms ${SETTLE_EASE}, border-radius ${SETTLE_DURATION}ms ${SETTLE_EASE}`;
    card.style.transform = "translate(0px, 0px) scale(1)";
    card.style.borderRadius = "2rem";
  });

  // transitionend is the primary cleanup path, but it doesn't reliably fire
  // in every environment (backgrounded tabs, reduced-motion edge cases), so
  // a timeout backstop guarantees the inline transform never gets stuck and
  // permanently overrides the click-to-zoom scale class below.
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    card.style.transition = "";
    card.style.transform = "";
    card.style.borderRadius = "";
  }
  card.addEventListener(
    "transitionend",
    (event) => {
      if (event.propertyName !== "transform") return;
      cleanup();
    },
    {once: true}
  );
  window.setTimeout(cleanup, SETTLE_DURATION + 150);
}

function forcePlay(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage(JSON.stringify({event: "command", func: "playVideo", args: []}), "https://www.youtube.com");
}

export function AboutContent() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const card = cardRef.current;
    if (!section || !card) return;

    // Replays on every entry, not just the first — scrolling away and back
    // (or revisiting /about) should retrigger the Netflix-style reveal.
    // Leaving view stops playback entirely (not just pauses) so the video is
    // always found at 0:00 next time — same guarantee standalone /about gets
    // for free from unmounting, reproduced here since this section stays
    // mounted while scrolled away on the homepage.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playIntro(card, section);
        } else {
          setIsPlaying(false);
          setIsZoomed(false);
        }
      },
      {threshold: 0.6}
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      className="shell flex min-h-[calc(100dvh-var(--header-height))] items-center justify-center py-16"
    >
      {isZoomed ? (
        <div
          className="fixed inset-0 z-[30] bg-[rgba(1,7,4,0.96)] backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsZoomed(false)}
          aria-hidden="true"
        />
      ) : null}

      <div
        ref={cardRef}
        className={`card relative z-[35] w-[95%] overflow-hidden p-0 shadow-card transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] sm:w-[92%] md:w-[84%] lg:w-[74%] ${
          isZoomed ? "scale-[1.08]" : "scale-100"
        }`}
      >
        <div className="relative aspect-video w-full bg-forest-900">
          {isPlaying ? (
            <div
              className={`h-full w-full ${isZoomed ? "" : "cursor-pointer"}`}
              onClick={() => {
                if (!isZoomed) {
                  setIsZoomed(true);
                  forcePlay(iframeRef.current);
                }
              }}
            >
              {/* Iframe ignores clicks while un-zoomed so this wrapper can re-trigger the zoom (and force playback). */}
              <iframe
                ref={iframeRef}
                className={`h-full w-full ${isZoomed ? "" : "pointer-events-none"}`}
                src={`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&rel=0&enablejsapi=1&loop=1&playlist=${VIDEO_ID}&origin=${encodeURIComponent(window.location.origin)}`}
                title="Natlovers"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsPlaying(true);
                setIsZoomed(true);
              }}
              className="group relative block h-full w-full"
              aria-label="Play video"
            >
              <img
                src={`https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`}
                alt="Natlovers video preview"
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 bg-[rgba(7,18,12,0.28)] transition-colors duration-300 group-hover:bg-[rgba(7,18,12,0.4)]" />
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sand-100 text-forest-900 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] sm:h-20 sm:w-20">
                <Play className="h-7 w-7 translate-x-0.5 fill-current sm:h-8 sm:w-8" />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
