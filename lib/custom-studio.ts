import {z} from "zod";
import type {ShopHandle, ShopMaterial, ShopProductType, ShopShape, ShopSize} from "@/app/catalogue/shop-data";

// Client-safe Custom Studio vocabulary: option catalogues, per-type
// configuration schemas, and the request status lifecycle. Deliberately
// imports no DB client (same split as lib/order-status.ts) so the studio's
// client components and the API routes can share one definition of what a
// valid configuration is, instead of the browser and the server each
// carrying their own drifting copy.

// ---------------------------------------------------------------------------
// Product types
// ---------------------------------------------------------------------------

// A subset of the catalogue's shopProductTypes. Accessories are made to
// fixed designs and are not offered as commissions, so the studio covers
// three of the four. These are the catalogue's own type names rather than a
// second custom-only vocabulary, which is what lets a request be matched
// against real products for preview imagery and pricing.
export const customProductTypes = ["Bags", "Dolls", "Apparels"] as const;

export type CustomProductType = (typeof customProductTypes)[number];

export function isCustomProductType(value: unknown): value is CustomProductType {
  return typeof value === "string" && (customProductTypes as readonly string[]).includes(value);
}

// Satisfies the compiler that every custom type is also a catalogue type  - 
// if someone later adds a type here the catalogue does not know about, this
// fails to compile rather than silently breaking preview lookups.
const typesAreCatalogueTypes: readonly ShopProductType[] = customProductTypes;
void typesAreCatalogueTypes;

// Drives the studio's dynamic heading ("Create your one-of-a-kind bag").
export const customTypeNoun: Record<CustomProductType, string> = {
  Bags: "bag",
  Dolls: "doll",
  Apparels: "piece"
};

export const customTypeTabLabel: Record<CustomProductType, string> = {
  Bags: "Bag",
  Dolls: "Doll",
  Apparels: "Apparel"
};

// ---------------------------------------------------------------------------
// Bag options
// ---------------------------------------------------------------------------

// Shapes and handles are the catalogue's own attribute values (see
// app/catalogue/shop-data.ts and the shape/handle_type columns on products),
// not a parallel set invented for the studio. That is what makes the live
// preview able to find a genuine photograph of the combination being
// configured instead of an approximation.
export const customBagShapes: ShopShape[] = ["Rectangle", "Round", "House Shaped"];

export const customBagHandles: ShopHandle[] = ["Handbag", "Shoulder Bag", "Sling Bag", "Clutch"];

export const customBagSizes: ShopSize[] = ["Small", "Medium", "Large"];

// The "base colour" row. Natlovers bags are undyed natural fibre, so the
// colour is the material  -  these are the five fibres the workshop actually
// weaves (bagMaterials in shop-data.ts), with swatch hexes taken from the
// catalogue's existing materialImageStyle palette rather than picked fresh.
// `active` retires a fibre from new commissions without deleting it, so
// historical requests still render their swatch.
export type CustomColourOption = {
  id: ShopMaterial;
  label: string;
  hex: string;
  active: boolean;
};

export const customBagColours: CustomColourOption[] = [
  {id: "Agel", label: "Agel", hex: "#EFE3CE", active: true},
  {id: "Water Hyacinth", label: "Water Hyacinth", hex: "#E1EADD", active: true},
  {id: "Gajih", label: "Gajih", hex: "#F3E2D6", active: true},
  {id: "Woven Fabric", label: "Woven Fabric", hex: "#E7DEEC", active: true},
  {id: "Patchwork", label: "Patchwork", hex: "#F0DEE0", active: true}
];

export const activeBagColours = () => customBagColours.filter((colour) => colour.active);

export const colourLabel = (id: string) => customBagColours.find((colour) => colour.id === id)?.label ?? id;

export const colourHex = (id: string) => customBagColours.find((colour) => colour.id === id)?.hex ?? "#EFE3CE";

// ---------------------------------------------------------------------------
// Personalisation
// ---------------------------------------------------------------------------

export const MAX_PERSONALISATION_TEXT = 16;

export const MAX_NOTES = 400;

// A small curated set, deliberately bounded: a motif has to be
// hand-embroidered by someone, so the list is limited by what the workshop
// can actually stitch rather than by how many icons exist. Each id maps to a
// lucide icon in the picker, so nothing here depends on bespoke artwork.
export const customMotifs = [
  {id: "leaf", label: "Leaf"},
  {id: "flower", label: "Flower"},
  {id: "bird", label: "Bird"},
  {id: "wave", label: "Wave"},
  {id: "sun", label: "Sun"},
  {id: "mountain", label: "Mountain"},
  {id: "heart", label: "Heart"},
  {id: "star", label: "Star"}
] as const;

export type CustomMotifId = (typeof customMotifs)[number]["id"];

const motifIds = customMotifs.map((motif) => motif.id) as [CustomMotifId, ...CustomMotifId[]];

export const motifLabel = (id: string) => customMotifs.find((motif) => motif.id === id)?.label ?? id;

// Three mutually exclusive states rather than two independent optional
// fields: a piece carries either stitched lettering or a stitched motif,
// never both, and a union makes that unrepresentable instead of merely
// discouraged.
export const personalisationSchema = z.discriminatedUnion("kind", [
  z.object({kind: z.literal("none")}),
  z.object({
    kind: z.literal("text"),
    text: z
      .string()
      .trim()
      .min(1, "Add the text to stitch, or choose no personal touch.")
      .max(MAX_PERSONALISATION_TEXT)
  }),
  z.object({kind: z.literal("motif"), motifId: z.enum(motifIds)})
]);

export type Personalisation = z.infer<typeof personalisationSchema>;

export const emptyPersonalisation: Personalisation = {kind: "none"};

export function describePersonalisation(personalisation: Personalisation | undefined): string {
  if (!personalisation) {
    return "None";
  }
  if (personalisation.kind === "text") {
    return `Stitched text: "${personalisation.text}"`;
  }
  if (personalisation.kind === "motif") {
    return `Motif: ${motifLabel(personalisation.motifId)}`;
  }
  return "None";
}

// ---------------------------------------------------------------------------
// Per-type configuration schemas
// ---------------------------------------------------------------------------

const shapeEnum = z.enum(["Rectangle", "Round", "House Shaped"]);
const handleEnum = z.enum(["Handbag", "Shoulder Bag", "Sling Bag", "Clutch"]);
const sizeEnum = z.enum(["Small", "Medium", "Large"]);
const colourEnum = z.enum(["Agel", "Water Hyacinth", "Gajih", "Woven Fabric", "Patchwork"]);

// handle and personalisation are no longer offered in the studio (the form
// was cut down to what a customer can meaningfully decide from a photograph
// alone). They stay in the schema as optional rather than being deleted,
// because requests submitted before the cut still carry them and the studio
// must keep rendering what those customers actually asked for.
export const bagConfigSchema = z.object({
  productType: z.literal("Bags"),
  shape: shapeEnum,
  colour: colourEnum,
  handle: handleEnum.optional(),
  size: sizeEnum,
  personalisation: personalisationSchema.optional()
});

// Deliberately minimal: a doll is sculpted from a photograph, so granular
// attribute controls would imply a precision the process does not have.
// What the studio genuinely needs is who it is of, roughly how big, and
// anything the customer wants said about clothing.
export const dollConfigSchema = z.object({
  productType: z.literal("Dolls"),
  subject: z.enum(["person", "pet"]),
  size: sizeEnum,
  clothingPreference: z.string().trim().max(200).default(""),
  personalisation: personalisationSchema.optional()
});

export const apparelConfigSchema = z.object({
  productType: z.literal("Apparels"),
  garment: z.enum(["Tote Apron", "Shirt", "Scarf", "Wrap"]),
  size: z.enum(["XS", "S", "M", "L", "XL"]),
  colour: colourEnum,
  placement: z.enum(["Chest", "Back", "Sleeve", "Hem"]),
  personalisation: personalisationSchema.optional()
});

export const customConfigSchema = z.discriminatedUnion("productType", [
  bagConfigSchema,
  dollConfigSchema,
  apparelConfigSchema
]);

export type BagConfig = z.infer<typeof bagConfigSchema>;
export type DollConfig = z.infer<typeof dollConfigSchema>;
export type ApparelConfig = z.infer<typeof apparelConfigSchema>;
export type CustomConfig = z.infer<typeof customConfigSchema>;

export const customApparelGarments: ApparelConfig["garment"][] = ["Tote Apron", "Shirt", "Scarf", "Wrap"];
export const customApparelSizes: ApparelConfig["size"][] = ["XS", "S", "M", "L", "XL"];
export const customApparelPlacements: ApparelConfig["placement"][] = ["Chest", "Back", "Sleeve", "Hem"];
export const customDollSubjects: DollConfig["subject"][] = ["person", "pet"];

export const dollSubjectLabels: Record<DollConfig["subject"], string> = {
  person: "A person",
  pet: "A pet"
};

export function defaultConfigFor(productType: CustomProductType): CustomConfig {
  if (productType === "Dolls") {
    return {
      productType: "Dolls",
      subject: "person",
      size: "Medium",
      clothingPreference: ""
    };
  }
  if (productType === "Apparels") {
    return {
      productType: "Apparels",
      garment: "Tote Apron",
      size: "M",
      colour: "Agel",
      placement: "Chest"
    };
  }
  return {
    productType: "Bags",
    shape: "Rectangle",
    colour: "Agel",
    size: "Medium"
  };
}

// Flattens any configuration into ordered label/value rows for the review
// panel, the admin detail view, and the notification email  -  one function so
// all three describe a request identically.
export function summariseConfig(config: CustomConfig): Array<{label: string; value: string}> {
  // Handle and Personal touch appear only when the stored configuration
  // actually carries them. New requests never do (both were retired from the
  // form), but requests submitted earlier still must show what was asked for.
  const retired = (config: CustomConfig) =>
    config.personalisation ? [{label: "Personal touch", value: describePersonalisation(config.personalisation)}] : [];

  if (config.productType === "Bags") {
    return [
      {label: "Shape", value: config.shape},
      {label: "Base colour", value: colourLabel(config.colour)},
      ...(config.handle ? [{label: "Handle", value: config.handle}] : []),
      {label: "Size", value: config.size},
      ...retired(config)
    ];
  }
  if (config.productType === "Dolls") {
    return [
      {label: "Subject", value: dollSubjectLabels[config.subject]},
      {label: "Approximate size", value: config.size},
      {label: "Clothing preference", value: config.clothingPreference?.trim() || "No preference given"},
      ...retired(config)
    ];
  }
  return [
    {label: "Garment", value: config.garment},
    {label: "Size", value: config.size},
    {label: "Base colour", value: colourLabel(config.colour)},
    {label: "Placement", value: config.placement},
    ...retired(config)
  ];
}

// ---------------------------------------------------------------------------
// Status lifecycle
// ---------------------------------------------------------------------------

// The commission lifecycle, kept deliberately short: a request is
// Submitted, the studio has it Under review, the customer has Approved
// the quote, and it's eventually Completed  -  with Cancelled as the one
// exception path out of that line. Pricing is its own concern (see the
// Pricing card) rather than a status of its own, so there's no separate
// "Quoted" stage to track here.
export const customRequestStatuses = ["draft", "submitted", "under_review", "approved", "completed", "cancelled"] as const;

export type CustomRequestStatus = (typeof customRequestStatuses)[number];

export const customRequestStatusSchema = z.enum(customRequestStatuses);

// Statuses an admin may set from the request detail view. `draft` is
// excluded because a draft belongs to the customer  -  it exists only until
// they submit, and nothing in the studio should be able to push a request
// back into a state the customer owns.
export const adminSettableStatuses = customRequestStatuses.filter(
  (status): status is Exclude<CustomRequestStatus, "draft"> => status !== "draft"
);

export const customRequestStatusLabels: Record<CustomRequestStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  completed: "Completed",
  cancelled: "Cancelled"
};

// What the customer sees in their own request history  -  "Under review" is
// internal shorthand for "the studio is still looking at it," which reads
// more plainly from the outside as "with the studio."
export const customerFacingStatusLabels: Record<CustomRequestStatus, string> = {
  draft: "Draft",
  submitted: "With the studio",
  under_review: "With the studio",
  approved: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled"
};

// Muted, palette-native badge colours matching the admin tables' existing
// tag styling rather than a traffic-light scheme.
export const customRequestStatusStyle: Record<CustomRequestStatus, {bg: string; border: string; text: string}> = {
  draft: {bg: "#EFEDE6", border: "#D6D2C6", text: "#4B4A42"},
  submitted: {bg: "#DCE6EA", border: "#B8CDD4", text: "#2A3D42"},
  under_review: {bg: "#DCE6EA", border: "#B8CDD4", text: "#2A3D42"},
  approved: {bg: "#DDE8DA", border: "#B6CCB1", text: "#2F4A2C"},
  completed: {bg: "#DDE8DA", border: "#B6CCB1", text: "#2F4A2C"},
  cancelled: {bg: "#F0DEE0", border: "#DEBBBF", text: "#5C2E33"}
};

// Statuses that still want someone at the studio to do something. Drives the
// dashboard's Needs Attention count.
export const openCustomRequestStatuses: CustomRequestStatus[] = ["submitted", "under_review"];

// The main, linear happy path a request is expected to travel  -  used to
// draw the Request Status stepper. Cancelled is a real status but isn't a
// "step" on this line (a request doesn't pass through Cancelled on its way
// to Completed), so it's handled as a separate banner state instead of a
// fifth step that would never light up in sequence.
export const customRequestStatusSteps = ["submitted", "under_review", "approved", "completed"] as const;

// One plain sentence per status, shown under the stepper so "what does this
// status actually mean" never requires asking someone who's used the tool
// longer  -  a draft is never shown here (drafts aren't admin-visible), but
// the type stays exhaustive for safety.
export const customRequestStatusStepDescriptions: Record<CustomRequestStatus, string> = {
  draft: "The customer hasn't submitted this request yet.",
  submitted: "Waiting for the studio to start reviewing this request.",
  under_review: "The studio is reviewing the request and preparing a quote.",
  approved: "The customer has confirmed. Production can begin.",
  completed: "This commission is finished.",
  cancelled: "This request was cancelled and is no longer active."
};

// ---------------------------------------------------------------------------
// Intake pause
// ---------------------------------------------------------------------------

export const DEFAULT_INTAKE_PAUSED_MESSAGE = "Custom Studio is temporarily paused, check back soon.";

// ---------------------------------------------------------------------------
// Local (pre-auth) draft
// ---------------------------------------------------------------------------

// The studio's own localStorage key for a draft that hasn't been saved
// server-side yet  -  shared with anything that hands a configuration to the
// studio before the customer is necessarily signed in (see the studio's own
// restore effect, and the product page's "Customise This Bag" button), so
// there is exactly one definition of what a local draft looks like.
export const LOCAL_CUSTOM_DRAFT_KEY = "natlovers-custom-draft";

export type LocalCustomDraft = {productType: CustomProductType; config: CustomConfig; notes: string};
