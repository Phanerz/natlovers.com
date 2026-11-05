"use client";

import {CSSProperties, ElementType, ReactNode, useEffect, useRef} from "react";

type ScrollSectionProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  style?: CSSProperties;
  /**
   * Marks this section as corresponding to a nav-bar route, so the header
   * can highlight that item while the section is in view even when the
   * URL itself hasn't changed (e.g. the catalogue embedded on the home
   * page, still under "/").
   */
  navHref?: string;
};

export function ScrollSection({children, className = "", as: Component = "div", style, navHref}: ScrollSectionProps) {
  const ref = useRef<HTMLElement | null>(null);

  // Phones and tablets: a section that starts below the fold is armed after
  // hydration and revealed (blur-fade-up, see [data-reveal] in globals.css) the
  // first time it scrolls into view. Sections already on screen, and any visitor
  // who prefers reduced motion or has no IntersectionObserver, are never hidden.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const phone = window.matchMedia("(max-width: 639px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!phone.matches || calm.matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;

    el.setAttribute("data-reveal", "pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          el.setAttribute("data-reveal", "in");
          observer.disconnect();
        }
      },
      {threshold: 0.08, rootMargin: "0px 0px -6% 0px"}
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Component ref={ref} data-nav-href={navHref} className={className} style={style}>
      {children}
    </Component>
  );
}
