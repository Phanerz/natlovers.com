import type {CSSProperties} from "react";

// The master NATLOVERS colour library: one ordered list shared by the admin
// product form (quick-add palette) and the storefront swatches, so a colour
// has one name and one hex everywhere. A product stores its own copy of the
// options it offers (see baseColourOptions / handleColourOptions in
// lib/db/schema.ts) in the order the admin arranged them, so editing this
// list never rewrites a product, an order or a cart  -  those keep the label
// they were created with.
//
// Deliberately not in the library: Dusty Rose, Midnight Navy, metallics
// (Champagne Gold etc.), Saddle Tan, or any shade that sits too close to one
// below. Add a colour only when it is genuinely distinct.

export type ColourOption = {
  label: string;
  // Empty for the multicolour swatch, which has no single colour value.
  hex: string;
  multicolour?: true;
};

export const MULTICOLOUR_LABEL = "Colourful";

export const COLOUR_LIBRARY: readonly ColourOption[] = [
  {label: "NATLOVERS Green", hex: "#344332"},
  {label: "Natural Lovers", hex: "#B89A72"},
  {label: "Ivory White", hex: "#F4F0E6"},
  {label: "Classic Black", hex: "#171717"},
  {label: "Soft Nude", hex: "#D0B49A"},
  {label: "Cognac", hex: "#A66A3F"},
  {label: "Dark Chestnut", hex: "#70452F"},
  {label: "Espresso", hex: "#493329"},
  {label: "Terracotta", hex: "#B65F45"},
  {label: "Vibrant Pink", hex: "#D84E67"},
  {label: "Rose Pink", hex: "#D994A3"},
  {label: "Marigold Yellow", hex: "#E5BD43"},
  {label: "Aqua Teal", hex: "#65BFC1"},
  {label: "Poppy Red", hex: "#C9363E"},
  {label: "Royal Blue", hex: "#2855A1"},
  {label: MULTICOLOUR_LABEL, hex: "", multicolour: true}
];

// What a brand-new product starts with (the three core brand colours).
export const DEFAULT_COLOUR_OPTIONS: readonly ColourOption[] = [
  COLOUR_LIBRARY[0],
  COLOUR_LIBRARY[2],
  COLOUR_LIBRARY[3]
];

// The old three-colour starter set, before the library existed. A product
// option that still matches one of these exactly (name AND hex) is moved to
// its library equivalent when the product is opened in the admin; anything
// the admin renamed or recoloured by hand is left alone.
const LEGACY_DEFAULTS: {label: string; hex: string; replacement: ColourOption}[] = [
  {label: "natlovers green", hex: "#344332", replacement: COLOUR_LIBRARY[0]},
  {label: "black", hex: "#000000", replacement: COLOUR_LIBRARY[3]},
  {label: "white", hex: "#ffffff", replacement: COLOUR_LIBRARY[2]}
];

// Colours that are no longer offered. They are not rewritten (that could
// change what a product or a past order means)  -  the editor just flags them
// so the admin can swap them for a library colour.
const RETIRED_LABELS = new Set(["dusty rose", "midnight navy"]);

export function isRetiredColour(option: ColourOption): boolean {
  return RETIRED_LABELS.has(option.label.trim().toLowerCase());
}

export function upgradeLegacyColour(option: ColourOption): ColourOption {
  const label = option.label.trim().toLowerCase();
  const hex = option.hex.trim().toLowerCase();
  const match = LEGACY_DEFAULTS.find((legacy) => legacy.label === label && legacy.hex === hex);
  return match ? {...match.replacement} : option;
}

export function upgradeLegacyColours(options: readonly ColourOption[]): ColourOption[] {
  return options.map(upgradeLegacyColour);
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(hex: string): boolean {
  return HEX_PATTERN.test(hex.trim());
}

export function isValidColour(option: ColourOption): boolean {
  return option.multicolour === true || isValidHex(option.hex);
}

export function isSameColour(a: ColourOption, b: ColourOption): boolean {
  return a.label.trim().toLowerCase() === b.label.trim().toLowerCase();
}

// A round swatch fill: the flat hex, or a conic sweep of the library's accent
// colours for the multicolour option.
export function colourSwatchStyle(option: ColourOption, validHex = true): CSSProperties {
  if (option.multicolour) {
    return {
      backgroundImage:
        "conic-gradient(from 20deg, #D84E67, #E5BD43, #65BFC1, #2855A1, #C9363E, #D84E67)"
    };
  }
  return {backgroundColor: validHex ? option.hex : "transparent"};
}
