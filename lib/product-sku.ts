import type {ShopMaterial, ShopProductType, ShopShape, ShopSize} from "@/app/catalogue/shop-data";

// NAT-[CATEGORY]-[DESIGN]-[VARIANT][MATERIAL][SHAPE][SIZE]-[SERIAL]
//
// Every lookup lives in this one file: adding a material, size, shape or
// category later is a one-line change to the matching table below  -  the
// generator, parser and validator all read from them.

export const SKU_BRAND = "NAT";
export const SKU_REGISTRATION_PLACEHOLDER = "XXXX";
export const SKU_DESIGN_MAX_LENGTH = 4;

// Shown for a section that applies to this product type but hasn't been
// picked yet, vs. one that doesn't apply to the type at all (a Doll has no
// material or shape).
export const SKU_UNSET = "?";
export const SKU_NOT_APPLICABLE = "0";

export const categoryCodes: Record<ShopProductType, string> = {
  Bags: "BG",
  Dolls: "DL",
  Accessories: "AC",
  Apparels: "AP"
};

export const materialCodes: Record<ShopMaterial, string> = {
  Agel: "1",
  Mendong: "2",
  Gajih: "3",
  Patchwork: "4",
  "Water Hyacinth": "5",
  "Woven Fabric": "6"
};

export const sizeCodes: Record<ShopSize, string> = {Small: "1", Medium: "2", Large: "3"};

export const shapeCodes: Record<ShopShape, string> = {
  "House Shaped": "1",
  Rectangle: "2",
  Round: "3",
  Other: "4"
};

// Which attribute sections each product type actually owns (mirrors
// attributesForType in lib/admin-products.ts).
const typeUses: Record<ShopProductType, {material: boolean; size: boolean; shape: boolean}> = {
  Bags: {material: true, size: true, shape: true},
  Dolls: {material: false, size: true, shape: false},
  Accessories: {material: false, size: false, shape: false},
  Apparels: {material: false, size: false, shape: false}
};

export type SkuParts = {
  productType: ShopProductType;
  design: string;
  variant: string;
  material: ShopMaterial | null;
  size: ShopSize | null;
  shape: ShopShape | null;
  registration: string;
};

export type SkuSegment = {key: string; label: string; value: string; auto: boolean; pending: boolean};

export function normalizeDesign(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, SKU_DESIGN_MAX_LENGTH);
}

export function normalizeVariant(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(-1);
}

// What the admin is typing, trimmed to the allowed characters and length.
export function cleanRegistration(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
}

// Always exactly four characters: empty stays "XXXX", a partial number is
// padded with X rather than producing a short code.
export function normalizeRegistration(value: string): string {
  return cleanRegistration(value).padEnd(4, "X");
}

// "Nona di Kebun Cafe" -> "NDKC", "Daisy" -> "DAIS". Initials when there are
// several words, otherwise the first letters of the single word.
export function suggestDesignAbbreviation(name: string): string {
  const words = name
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
  if (!words.length) return "";
  if (words.length === 1) return words[0].slice(0, SKU_DESIGN_MAX_LENGTH);
  return words
    .map((word) => word[0])
    .join("")
    .slice(0, SKU_DESIGN_MAX_LENGTH);
}

function digit<T extends string>(applies: boolean, selection: T | null, codes: Record<T, string>): string {
  if (!applies) return SKU_NOT_APPLICABLE;
  return selection && codes[selection] ? codes[selection] : SKU_UNSET;
}

export function skuSegments(parts: SkuParts): SkuSegment[] {
  const uses = typeUses[parts.productType];
  const design = normalizeDesign(parts.design);
  const variant = normalizeVariant(parts.variant);
  return [
    {key: "brand", label: "Brand", value: SKU_BRAND, auto: true, pending: false},
    {key: "category", label: "Category", value: categoryCodes[parts.productType], auto: true, pending: false},
    {key: "design", label: "Design", value: design || "????", auto: false, pending: !design},
    {key: "variant", label: "Variant", value: variant || SKU_UNSET, auto: false, pending: !variant},
    {key: "material", label: "Material", value: digit(uses.material, parts.material, materialCodes), auto: true, pending: false},
    {key: "shape", label: "Shape", value: digit(uses.shape, parts.shape, shapeCodes), auto: true, pending: false},
    {key: "size", label: "Size", value: digit(uses.size, parts.size, sizeCodes), auto: true, pending: false},
    {key: "registration", label: "Serial No.", value: normalizeRegistration(parts.registration), auto: false, pending: false}
  ].map((segment) => ({...segment, pending: segment.pending || segment.value.includes(SKU_UNSET)}));
}

function assemble(segments: SkuSegment[]): string {
  const value = (key: string) => segments.find((segment) => segment.key === key)!.value;
  const attributes = `${value("variant")}${value("material")}${value("shape")}${value("size")}`;
  return [value("brand"), value("category"), value("design"), attributes, value("registration")].join("-");
}

// The full code for display, with "?" / "????" standing in for anything not
// picked yet. Never saved as-is  -  see buildSku for the savable form.
export function displaySku(parts: SkuParts): string {
  return assemble(skuSegments(parts));
}

// Null until every section that applies to this product type is filled in,
// so a half-built code can never reach the database.
export function buildSku(parts: SkuParts): string | null {
  const segments = skuSegments(parts);
  if (segments.some((segment) => segment.pending)) return null;
  return assemble(segments);
}

// Why a code can't be built yet, phrased for the admin. Null when it can.
export function skuProblem(parts: SkuParts): string | null {
  if (!normalizeDesign(parts.design)) return "Add a design abbreviation (up to 4 letters or numbers) to generate the SKU.";
  if (!normalizeVariant(parts.variant)) return "Add a single-digit variant to generate the SKU.";
  const uses = typeUses[parts.productType];
  if (uses.material && !parts.material) return "Pick a material to complete the SKU.";
  if (uses.size && !parts.size) {
    return parts.productType === "Bags" ? "Size unavailable — check body dimensions." : "Pick a size to complete the SKU.";
  }
  if (uses.shape && !parts.shape) return "Pick a shape to complete the SKU.";
  return null;
}

const codeToKey = <T extends string>(codes: Record<T, string>) =>
  Object.fromEntries(Object.entries<string>(codes).map(([key, code]) => [code, key])) as Record<string, T>;

const SKU_PATTERN = /^NAT-([A-Z]{2})-([A-Z0-9]{1,4})-(\d)(\d)(\d)(\d)-([A-Z0-9]{4})$/;

// Reads a stored product code back into its parts, or null when it doesn't
// follow the structured format (older free-text codes).
export function parseSku(code: string, productType: ShopProductType): Omit<SkuParts, "productType"> | null {
  const match = SKU_PATTERN.exec(code);
  if (!match) return null;
  const [, category, design, variant, material, shape, size, registration] = match;
  if (category !== categoryCodes[productType]) return null;
  return {
    design,
    variant,
    material: codeToKey(materialCodes)[material] ?? null,
    size: codeToKey(sizeCodes)[size] ?? null,
    shape: codeToKey(shapeCodes)[shape] ?? null,
    registration
  };
}
