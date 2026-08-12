"use client";

import {CSSProperties, ElementType, ReactNode} from "react";

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
  return (
    <Component data-nav-href={navHref} className={className} style={style}>
      {children}
    </Component>
  );
}
