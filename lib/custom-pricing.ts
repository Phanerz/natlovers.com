import type {CustomConfig, CustomProductType} from "@/lib/custom-studio";
import {colourLabel, describePersonalisation} from "@/lib/custom-studio";

// The single source of Custom Studio pricing. Nothing anywhere else in the
// app is allowed to add a number to an estimate  -  every component that shows
// a price calls calculateEstimate() and renders what it returns.
//
// Two deliberate rules govern this file:
//
//  1. The base price is never written down here. It is derived from real
//     catalogue prices (see getPricingBasis in lib/custom-requests.ts, which
//     reads the lowest active price per product type), so an estimate is
//     always anchored to something the workshop genuinely charges for
//     comparable work rather than to a number invented in code.
//
//  2. Every modifier below currently reads 0, and that is intentional, not
//     an oversight. Nobody has supplied the real surcharges yet, and a
//     plausible-looking guess shown to a customer as an "Estimated total" is
//     worse than no surcharge at all. Fill these in with the workshop's
//     actual figures, in IDR, and the whole studio picks them up  -  no other
//     file needs touching.

export type PricingModifiers = {
  // Bags
  shape: Record<string, number>;
  colour: Record<string, number>;
  handle: Record<string, number>;
  size: Record<string, number>;
  // Dolls
  dollSubject: Record<string, number>;
  dollSize: Record<string, number>;
  // Apparel
  garment: Record<string, number>;
  apparelSize: Record<string, number>;
  placement: Record<string, number>;
  // Shared
  personalisationText: number;
  personalisationMotif: number;
};

// TODO(pricing): replace the zeroes with the workshop's real surcharges in
// IDR. Until then every estimate equals the derived base price, which is
// honest  -  the studio confirms the final figure either way.
export const pricingModifiers: PricingModifiers = {
  shape: {
    Rectangle: 0,
    Round: 0,
    "House Shaped": 0
  },
  colour: {
    Agel: 0,
    "Water Hyacinth": 0,
    Gajih: 0,
    "Woven Fabric": 0,
    Patchwork: 0
  },
  handle: {
    Handbag: 0,
    "Shoulder Bag": 0,
    "Sling Bag": 0,
    Clutch: 0
  },
  size: {
    Small: 0,
    Medium: 0,
    Large: 0
  },
  dollSubject: {
    person: 0,
    pet: 0
  },
  dollSize: {
    Small: 0,
    Medium: 0,
    Large: 0
  },
  garment: {
    "Tote Apron": 0,
    Shirt: 0,
    Scarf: 0,
    Wrap: 0
  },
  apparelSize: {
    XS: 0,
    S: 0,
    M: 0,
    L: 0,
    XL: 0
  },
  placement: {
    Chest: 0,
    Back: 0,
    Sleeve: 0,
    Hem: 0
  },
  personalisationText: 0,
  personalisationMotif: 0
};

// Lowest active catalogue price per product type, in IDR. A null entry means
// the catalogue holds no active product of that type at all, so there is
// nothing real to anchor an estimate to  -  the studio quotes that request by
// hand instead of the page showing a made-up figure.
export type PricingBasis = Record<CustomProductType, number | null>;

export const emptyPricingBasis: PricingBasis = {Bags: null, Dolls: null, Apparels: null};

export type EstimateLine = {
  label: string;
  detail: string;
  amountIdr: number;
};

export type Estimate = {
  basePriceIdr: number;
  lines: EstimateLine[];
  totalIdr: number;
};

function modifier(table: Record<string, number>, key: string): number {
  return table[key] ?? 0;
}

// Returns null when the product type has no catalogue price to build on.
// Callers render "Quoted after studio review" in that case  -  see
// EstimatePanel  -  rather than falling back to a placeholder amount.
export function calculateEstimate(config: CustomConfig, basis: PricingBasis): Estimate | null {
  const basePriceIdr = basis[config.productType];
  if (basePriceIdr === null || basePriceIdr === undefined) {
    return null;
  }

  const lines: EstimateLine[] = [];

  if (config.productType === "Bags") {
    lines.push({label: "Shape", detail: config.shape, amountIdr: modifier(pricingModifiers.shape, config.shape)});
    lines.push({
      label: "Base colour",
      detail: colourLabel(config.colour),
      amountIdr: modifier(pricingModifiers.colour, config.colour)
    });
    // Only priced when the stored configuration actually carries a handle  - 
    // the studio stopped asking for one, but older requests still have it.
    if (config.handle) {
      lines.push({label: "Handle", detail: config.handle, amountIdr: modifier(pricingModifiers.handle, config.handle)});
    }
    lines.push({label: "Size", detail: config.size, amountIdr: modifier(pricingModifiers.size, config.size)});
  } else if (config.productType === "Dolls") {
    lines.push({
      label: "Subject",
      detail: config.subject === "pet" ? "A pet" : "A person",
      amountIdr: modifier(pricingModifiers.dollSubject, config.subject)
    });
    lines.push({label: "Size", detail: config.size, amountIdr: modifier(pricingModifiers.dollSize, config.size)});
  } else {
    lines.push({
      label: "Garment",
      detail: config.garment,
      amountIdr: modifier(pricingModifiers.garment, config.garment)
    });
    lines.push({label: "Size", detail: config.size, amountIdr: modifier(pricingModifiers.apparelSize, config.size)});
    lines.push({
      label: "Base colour",
      detail: colourLabel(config.colour),
      amountIdr: modifier(pricingModifiers.colour, config.colour)
    });
    lines.push({
      label: "Placement",
      detail: config.placement,
      amountIdr: modifier(pricingModifiers.placement, config.placement)
    });
  }

  const personalisation = config.personalisation;
  if (personalisation && personalisation.kind !== "none") {
    lines.push({
      label: "Personal touch",
      detail: describePersonalisation(personalisation),
      amountIdr:
        personalisation.kind === "text"
          ? pricingModifiers.personalisationText
          : pricingModifiers.personalisationMotif
    });
  }

  const totalIdr = lines.reduce((sum, line) => sum + line.amountIdr, basePriceIdr);

  return {basePriceIdr, lines, totalIdr};
}

// True when every configured modifier is still zero, i.e. the estimate is
// just the base price. The studio's review panel uses this to be explicit
// that option surcharges are not yet reflected, instead of implying the
// options happen to be free.
export function modifiersAreUnconfigured(estimate: Estimate | null): boolean {
  return Boolean(estimate) && estimate!.lines.every((line) => line.amountIdr === 0);
}

// Shown wherever an estimate appears. The studio quotes the real figure
// after looking at the request, and the page must never imply otherwise.
export const ESTIMATE_DISCLAIMER =
  "This is an estimate, not a final price. The studio confirms the actual cost after reviewing your request.";
