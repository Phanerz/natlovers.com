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

      // At the very top of the page the first section is always the one in
      // view. Without this, a measurement taken while the layout was still
      // settling could crown a later section and leave it stuck (nothing
      // scrolls, so nothing re-measures).
      if (scrollY <= 4) {
        setActiveNavSection(current.getAttribute("data-nav-href"));
        return;
      }

      let laidOut = 0;
      sections.forEach((section) => {
        const box = section.getBoundingClientRect();
        // A section that has collapsed to nothing (content not laid out yet)
        // has no real position, so it can't be "under the header".
        if (box.height < 1) {
          return;
        }
        laidOut += 1;
        if (box.top + scrollY <= scrollY + offset + 4) {
          current = section;
        }
      });

      // Nothing has a real size yet: keep whatever we had rather than guess.
      if (laidOut === 0) {
        return;
      }

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

    // Layout can also change with no scroll or resize at all (an async
    // section swapping its loader for content, images, fonts). Re-measure
    // whenever the page or any section changes size, so a wrong pick can't
    // outlive the layout that caused it.
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleCompute);
    resizeObserver?.observe(document.body);
    sections.forEach((section) => resizeObserver?.observe(section));

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("scroll", scheduleCompute);
      window.removeEventListener("resize", scheduleCompute);
      document.removeEventListener("visibilitychange", scheduleCompute);
      window.clearTimeout(settleTimeout);
      resizeObserver?.disconnect();
    };
  }, [pathname]);

  return activeNavSection;
}
