import type {ShopProductType} from "@/app/catalogue/shop-data";

// Shared (client + server) definitions for the editorial banners that sit
// between products in the catalogue grid. See catalogueBanners in
// lib/db/schema.ts for how a banner is stored and what each field means.

export const desktopSpans = ["1x1", "2x1", "full"] as const;
export type DesktopSpan = (typeof desktopSpans)[number];

export const mobileSpans = ["full", "single"] as const;
export type MobileSpan = (typeof mobileSpans)[number];

export const bannerOverlays = ["dark", "light", "none"] as const;
export type BannerOverlay = (typeof bannerOverlays)[number];

export const desktopSpanLabels: Record<DesktopSpan, string> = {
  "1x1": "1 × 1 (one product cell)",
  "2x1": "2 × 1 (two cells wide)",
  full: "Full width"
};

export const mobileSpanLabels: Record<MobileSpan, string> = {
  full: "Full width (recommended)",
  single: "One column"
};

export const bannerOverlayLabels: Record<BannerOverlay, string> = {
  dark: "Dark wash, light text",
  light: "Light wash, dark text",
  none: "No wash"
};

export type PublicBanner = {
  id: string;
  eyebrow: string | null;
  title: string;
  description: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  destinationUrl: string | null;
  // Null = every category.
  category: ShopProductType | null;
  insertAfter: number;
  desktopSpan: DesktopSpan;
  mobileSpan: MobileSpan;
  overlay: BannerOverlay;
};

export type AdminBanner = PublicBanner & {
  isActive: boolean;
  displayOrder: number;
};

// A destination is either a path on this site or an https URL  -  never
// javascript:, data: or a protocol-relative URL.
export function isSafeBannerDestination(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) {
    return true;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// How many grid columns a banner takes up, given how many columns the grid has.
export function bannerColumnSpan(banner: PublicBanner, columns: number, isMobile: boolean): number {
  if (isMobile) {
    return banner.mobileSpan === "full" ? columns : 1;
  }
  if (banner.desktopSpan === "full") {
    return columns;
  }
  return Math.min(columns, banner.desktopSpan === "2x1" ? 2 : 1);
}

export type CatalogueEntry<P> = {kind: "product"; product: P} | {kind: "banner"; banner: PublicBanner};

// Slots banners into the displayed product list: a banner with insertAfter = N
// sits after the Nth product that is actually shown (so filtering and sorting
// move it with the list), and ones that are past the end are simply not shown.
// A banner never counts as a product, and each banner appears exactly once.
export function interleaveBanners<P>(products: P[], banners: PublicBanner[]): CatalogueEntry<P>[] {
  const ordered = [...banners].sort((a, b) => a.insertAfter - b.insertAfter);
  const entries: CatalogueEntry<P>[] = [];
  let next = 0;

  for (let shown = 0; shown <= products.length; shown += 1) {
    while (next < ordered.length && ordered[next].insertAfter <= shown) {
      entries.push({kind: "banner", banner: ordered[next]});
      next += 1;
    }
    if (shown < products.length) {
      entries.push({kind: "product", product: products[shown]});
    }
  }
  return entries;
}

// Packs entries into pages of `rows` grid rows. A banner that is wider than
// what is left of the current row would leave a hole, so the next products are
// pulled up into those cells first and the banner starts the following row:
// products always keep their order, and a banner lands at most a few products
// after its insertion point (never before it).
export function paginateEntries<P>(
  entries: CatalogueEntry<P>[],
  columns: number,
  rows: number,
  isMobile: boolean
): CatalogueEntry<P>[][] {
  const pages: CatalogueEntry<P>[][] = [[]];
  let row = 0;
  let column = 0;

  const place = (entry: CatalogueEntry<P>, span: number) => {
    if (column > 0 && column + span > columns) {
      row += 1;
      column = 0;
    }
    if (row >= rows) {
      pages.push([]);
      row = 0;
      column = 0;
    }
    pages[pages.length - 1].push(entry);
    column += span;
    if (column >= columns) {
      row += 1;
      column = 0;
    }
  };

  const queue = [...entries];
  while (queue.length > 0) {
    const entry = queue.shift() as CatalogueEntry<P>;
    const span = entry.kind === "banner" ? bannerColumnSpan(entry.banner, columns, isMobile) : 1;

    if (entry.kind === "banner" && column > 0 && column + span > columns) {
      let remaining = columns - column;
      let pulled = 0;
      while (remaining > 0 && queue.length > 0 && queue[0].kind === "product") {
        place(queue.shift() as CatalogueEntry<P>, 1);
        remaining -= 1;
        pulled += 1;
      }
      if (pulled === 0 || column > 0) {
        // Nothing more to pull up (or only part of the gap could be filled):
        // end this row and start the banner on the next.
        row += 1;
        column = 0;
      }
    }

    place(entry, span);
  }

  return pages.filter((page, index) => page.length > 0 || index === 0);
}
