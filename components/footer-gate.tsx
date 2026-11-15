"use client";

import type {ReactNode} from "react";
import {usePathname} from "next/navigation";

// A single product page (/catalogue/some-piece) closes with its own section and has no site footer.
// The catalogue list, the home page and every other page keep it.
const PRODUCT_PAGE = /^\/catalogue\/[^/]+\/?$/;

export function FooterGate({children}: {children: ReactNode}) {
  const pathname = usePathname();
  if (pathname && PRODUCT_PAGE.test(pathname)) return null;
  return <>{children}</>;
}
