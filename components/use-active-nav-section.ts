"use client";

import {usePathname} from "next/navigation";
import {useEffect, useState} from "react";

/**
 * Tracks which [data-nav-href] section is currently under the sticky
 * header, independent of the CSS scroll-snap that now drives the actual
 * scrolling  -  this only *observes* scroll position, it never drives it, so
 * it works identically whether a section arrived via a snap, a wheel tick,
 * a dot-nav click, or a plain drag of the scrollbar. Shared by the header's
 * nav pill and the section dot-nav so both agree on "current section" from
 * the same source of truth instead of two independent trackers drifting
 * apart.
 */
export function useActiveNavSection(): string | null {
  const pathname = usePathname();
  const [activeNavSection, setActiveNavSection] = useState<string | null>(null);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-nav-href]"));
    if (!sections.length) {
      setActiveNavSection(null);
      return;
    }

    let rafId: number | null = null;

    function computeActiveSection() {
      rafId = null;
      const headerEl = document.querySelector("header");
      const offset = headerEl ? headerEl.getBoundingClientRect().height : 0;
      const scrollY = window.scrollY;
      let current = sections[0];

      sections.forEach((section) => {
        const top = section.getBoundingClientRect().top + scrollY;
        if (top <= scrollY + offset + 4) {
          current = section;
        }
      });

      setActiveNavSection(current.getAttribute("data-nav-href"));
    }

    function scheduleCompute() {
      if (rafId === null) {
        rafId = requestAnimationFrame(computeActiveSection);
      }
    }

    computeActiveSection();
    window.addEventListener("scroll", scheduleCompute, {passive: true});
    window.addEventListener("resize", scheduleCompute);
    document.addEventListener("visibilitychange", scheduleCompute);

    // The very first computeActiveSection() call above can measure a page
    // that isn't in its final state yet  -  a webfont swap, an image
    // claiming its final size, or (in some embedding contexts) the tab
    // simply not being composited yet all leave every section's measured
    // position collapsed near 0, which makes the *last* one in DOM order
    // win the "which section is above the fold" check. Nothing else
    // re-triggers a recompute afterwards, so that wrong pick can stick
    // indefinitely. document.fonts.ready is the direct signal for the font
    // case; the timeout is a blunter backstop for everything else.
    document.fonts?.ready?.then(scheduleCompute).catch(() => {});
    const settleTimeout = window.setTimeout(scheduleCompute, 400);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", scheduleCompute);
      window.removeEventListener("resize", scheduleCompute);
      document.removeEventListener("visibilitychange", scheduleCompute);
      window.clearTimeout(settleTimeout);
    };
  }, [pathname]);

  return activeNavSection;
}
