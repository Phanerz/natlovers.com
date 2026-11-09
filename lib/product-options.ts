import {z} from "zod";

// Admin-defined, per-product customisation: the "burger order" model. The
// admin builds a list of fields for a product (a colour pick, a choice list,
// a text note, a reference photo, or an add-on such as extra dolls or pets
// with their own sub-fields); the customer fills them in on the product page;
// whatever they picked is frozen onto the order line so the studio can read
// exactly what to make. Pricing lives here too, and is always recomputed on
// the server from this definition  -  the client only ever displays it.
//
// A product with no definition (the column is null) or `enabled: false` shows
// none of this, which is how every existing bag stays exactly as it was.

const id = z.string().trim().min(1).max(40);
const label = z.string().trim().min(1).max(80);
const price = z.number().int().min(0).max(100_000_000);

const colourOption = z.object({
  label: z.string().trim().min(1).max(60),
  hex: z.string().trim().max(9).default("#cccccc"),
  multicolour: z.literal(true).optional()
});

const choiceOption = z.object({label: z.string().trim().min(1).max(60), priceIdr: price.default(0)});

const colourField = z.object({kind: z.literal("colour"), id, label, options: z.array(colourOption).min(1).max(24)});
const choiceField = z.object({kind: z.literal("choice"), id, label, options: z.array(choiceOption).min(1).max(24)});
const textField = z.object({
  kind: z.literal("text"),
  id,
  label,
  placeholder: z.string().trim().max(120).optional(),
  maxLength: z.number().int().min(20).max(1000).default(300)
});

// What an add-on's every copy asks for (clothing colour, breed, coat colour…).
const subField = z.discriminatedUnion("kind", [colourField, choiceField, textField]);

const imageField = z.object({kind: z.literal("image"), id, label, maxFiles: z.number().int().min(1).max(5).default(3)});

const addonField = z.object({
  kind: z.literal("addon"),
  id,
  label,
  // How one copy is called ("doll", "dog", "cat").
  itemLabel: z.string().trim().min(1).max(40),
  // The count that comes with the bag at its listed price, the fewest and the
  // most a customer may choose, and what each copy above the included count
  // adds to the price.
  includedCount: z.number().int().min(0).max(20).default(0),
  minCount: z.number().int().min(0).max(20).default(0),
  maxCount: z.number().int().min(1).max(20).default(4),
  unitPriceIdr: price.default(0),
  fields: z.array(subField).max(8).default([])
});

export const optionFieldSchema = z.discriminatedUnion("kind", [colourField, choiceField, textField, imageField, addonField]);

// Which felted animals (see lib/addon-shared.ts) this product offers: none, every
// animal that is switched on in Add-ons, or only the ones ticked here. It sits
// inside the custom options, so switching custom options off offers no animals.
export const animalsSchema = z.object({
  mode: z.enum(["none", "all", "selected"]).default("none"),
  speciesIds: z.array(z.string().trim().min(1).max(64)).max(80).default([])
});

export const productOptionsSchema = z.object({
  enabled: z.boolean().default(false),
  fields: z.array(optionFieldSchema).max(24).default([]),
  animals: animalsSchema.default({mode: "none", speciesIds: []})
});

export type OptionField = z.infer<typeof optionFieldSchema>;
export type SubField = z.infer<typeof subField>;
export type ProductOptions = z.infer<typeof productOptionsSchema>;

export const EMPTY_PRODUCT_OPTIONS: ProductOptions = {enabled: false, fields: [], animals: {mode: "none", speciesIds: []}};

// The animals this product may offer: null for none, "all", or the ticked ids.
// Anything is "none" while custom options are off.
export function allowedAnimals(options: ProductOptions | null | undefined): "all" | string[] | null {
  if (!options || !options.enabled) return null;
  const animals = options.animals;
  if (!animals || animals.mode === "none") return null;
  if (animals.mode === "all") return "all";
  return animals.speciesIds.length ? animals.speciesIds : null;
}

// What the customer chose, keyed by field id. One loose shape for every kind
// keeps it simple to store; resolveOptions() is what reads it strictly.
export const optionAnswerSchema = z.object({
  v: z.string().max(1000).optional(),
  urls: z.array(z.string().url().max(600)).max(5).optional(),
  count: z.number().int().min(0).max(20).optional(),
  items: z.array(z.record(z.string().max(60), z.string().max(1000))).max(20).optional()
});

export type OptionAnswer = z.infer<typeof optionAnswerSchema>;
export type OptionAnswers = Record<string, OptionAnswer>;

export const optionAnswersSchema = z.record(z.string().max(40), optionAnswerSchema).refine((value) => Object.keys(value).length <= 30);

// One row of the finished "receipt": what it was, what was chosen, what it adds.
export type ResolvedLine = {
  label: string;
  value: string;
  extraIdr: number;
  // Set on add-on lines, which have their own fixed dollar price.
  extraUsdCents?: number;
  images?: string[];
  hex?: string;
};

export type ResolvedOptions = {lines: ResolvedLine[]; extraIdr: number};

export const resolvedLineSchema = z.object({
  label: z.string().max(200),
  value: z.string().max(1200),
  extraIdr: z.number().int().min(0),
  extraUsdCents: z.number().int().min(0).optional(),
  images: z.array(z.string().max(600)).max(5).optional(),
  hex: z.string().max(9).optional()
});

export function isOptionsEnabled(options: ProductOptions | null | undefined): options is ProductOptions {
  return Boolean(options && options.enabled && (options.fields.length || allowedAnimals(options)));
}

// A fresh set of answers with every field at its starting point: first colour,
// first choice, the included number of add-ons, nothing typed or uploaded.
export function defaultAnswers(options: ProductOptions): OptionAnswers {
  const answers: OptionAnswers = {};
  for (const field of options.fields) {
    if (field.kind === "colour") {
      answers[field.id] = {v: field.options[0].label};
    } else if (field.kind === "choice") {
      answers[field.id] = {v: field.options[0].label};
    } else if (field.kind === "text") {
      answers[field.id] = {v: ""};
    } else if (field.kind === "image") {
      answers[field.id] = {urls: []};
    } else {
      const count = clamp(field.includedCount, field.minCount, field.maxCount);
      answers[field.id] = {count, items: Array.from({length: count}, () => defaultItem(field.fields))};
    }
  }
  return answers;
}

export function defaultItem(fields: SubField[]): Record<string, string> {
  const item: Record<string, string> = {};
  for (const sub of fields) {
    item[sub.id] = sub.kind === "text" ? "" : sub.options[0].label;
  }
  return item;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function pickOption<T extends {label: string}>(options: T[], value: string | undefined): T {
  return options.find((option) => option.label === value) ?? options[0];
}

function describeItem(fields: SubField[], item: Record<string, string>): {text: string; extraIdr: number} {
  const parts: string[] = [];
  let extraIdr = 0;
  for (const sub of fields) {
    if (sub.kind === "text") {
      const typed = (item[sub.id] ?? "").trim().slice(0, sub.maxLength);
      if (typed) {
        parts.push(`${sub.label}: ${typed}`);
      }
    } else if (sub.kind === "colour") {
      parts.push(`${sub.label}: ${pickOption(sub.options, item[sub.id]).label}`);
    } else {
      const option = pickOption(sub.options, item[sub.id]);
      extraIdr += option.priceIdr;
      parts.push(`${sub.label}: ${option.label}`);
    }
  }
  return {text: parts.join(" · "), extraIdr};
}

// The single source of truth for both what the customer sees as they choose
// and what the server charges: answers in, receipt lines and total extra out.
// Anything not matching the definition falls back to a valid default rather
// than failing, so a stale cart line never blocks checkout; it just resolves
// to the closest legitimate selection.
export function resolveOptions(options: ProductOptions | null | undefined, answers: OptionAnswers | null | undefined): ResolvedOptions {
  if (!isOptionsEnabled(options)) {
    return {lines: [], extraIdr: 0};
  }

  const lines: ResolvedLine[] = [];
  for (const field of options.fields) {
    const answer = answers?.[field.id] ?? {};

    if (field.kind === "colour") {
      const option = pickOption(field.options, answer.v);
      lines.push({label: field.label, value: option.label, extraIdr: 0, hex: option.hex});
    } else if (field.kind === "choice") {
      const option = pickOption(field.options, answer.v);
      lines.push({label: field.label, value: option.label, extraIdr: option.priceIdr});
    } else if (field.kind === "text") {
      const typed = (answer.v ?? "").trim().slice(0, field.maxLength);
      if (typed) {
        lines.push({label: field.label, value: typed, extraIdr: 0});
      }
    } else if (field.kind === "image") {
      const urls = (answer.urls ?? []).filter((url) => url.startsWith("https://")).slice(0, field.maxFiles);
      if (urls.length) {
        lines.push({label: field.label, value: `${urls.length} reference ${urls.length === 1 ? "photo" : "photos"}`, extraIdr: 0, images: urls});
      }
    } else {
      const count = clamp(answer.count ?? field.includedCount, field.minCount, field.maxCount);
      for (let index = 0; index < count; index += 1) {
        const item = answer.items?.[index] ?? {};
        const described = describeItem(field.fields, item);
        const extra = (index >= field.includedCount ? field.unitPriceIdr : 0) + described.extraIdr;
        const name = `${field.itemLabel.charAt(0).toUpperCase()}${field.itemLabel.slice(1)} ${index + 1}`;
        lines.push({label: name, value: described.text || "As pictured", extraIdr: extra});
      }
    }
  }

  return {lines, extraIdr: lines.reduce((sum, line) => sum + line.extraIdr, 0)};
}

// A cart/order line's config may carry custom answers; this reads them against
// the product's current definition. Used wherever a line is priced or listed
// on the storefront (the bag, the bank-transfer summary).
export function selectionExtras(options: ProductOptions | null | undefined, config: unknown): ResolvedOptions {
  const answers = (config as {custom?: {answers?: OptionAnswers}} | null)?.custom?.answers;
  const base = answers ? resolveOptions(options, answers) : {lines: [], extraIdr: 0};
  // Add-on animals (see lib/addon-shared.ts) carry their own readable, priced lines.
  const addonLines = (config as {addonLines?: ResolvedLine[]} | null)?.addonLines;
  if (!Array.isArray(addonLines) || !addonLines.length) return base;
  return {lines: [...base.lines, ...addonLines], extraIdr: base.extraIdr + addonLines.reduce((sum, line) => sum + line.extraIdr, 0)};
}
