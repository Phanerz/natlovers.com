// Starting data for the add-on system, from the species and colour list Anita
// provided. Names, defaults and the pose variants are hers. The hex values are
// an approximation for the swatches, to be tuned in admin by eye against the
// real felt. Nothing here is read by the storefront: scripts/seed-addons.ts
// copies it into the database once, and admin owns it from then on.

export type SeedColour = {kind: "solid" | "two_tone" | "three_tone"; hexes: string[]};

// One shared colour library. Every swatch below is built from these names, so the
// same basic vocabulary (Brown, Black, White, Grey...) looks identical wherever it
// appears, and a combination is just two or three library colours side by side.
// The first ten are the core vocabulary; the rest are the few other shades the
// animals need. Add a shade here once, never as a one-off hex inside a species.
export const COLOUR_LIBRARY: Record<string, string> = {
  Brown: "#7a4e2d",
  Black: "#2a2523",
  White: "#f4efe6",
  Grey: "#9b9b98",
  Chestnut: "#8c3f22",
  "Dark Tan": "#a67c4e",
  "Light Tan": "#d9bf94",
  "Light Cream": "#efe6d0",
  Blue: "#8aa6bd",
  Red: "#a63a2a",
  // Other shades
  "Light Brown": "#b58a5a",
  "Dark Brown": "#4b2e1c",
  Tan: "#c9a37a",
  Chocolate: "#4a2c20",
  Fawn: "#d4aa78",
  Sable: "#a8723f",
  Orange: "#d98a3d",
  Yellow: "#e2bd4a",
  Green: "#4f7a4f",
  "Mallard Green": "#3d6b4a",
  Pink: "#e3a9b0",
  "Light Grey": "#c4c2c0",
  "Pink Grey": "#d4b8b8"
};

function lib(name: string): string {
  const hex = COLOUR_LIBRARY[name];
  if (!hex) throw new Error(`"${name}" is not in the colour library`);
  return hex;
}

// A swatch of one, two or three library colours.
function swatch(...names: string[]): SeedColour {
  return {kind: names.length === 1 ? "solid" : names.length === 2 ? "two_tone" : "three_tone", hexes: names.map(lib)};
}

export const SEED_COLOURS: Record<string, SeedColour> = {
  // Single colours
  Brown: swatch("Brown"),
  Black: swatch("Black"),
  White: swatch("White"),
  Grey: swatch("Grey"),
  Chestnut: swatch("Chestnut"),
  "Dark Tan": swatch("Dark Tan"),
  "Light Tan": swatch("Light Tan"),
  "Light Cream": swatch("Light Cream"),
  Blue: swatch("Blue"),
  Red: swatch("Red"),
  "Light Brown": swatch("Light Brown"),
  "Dark Brown": swatch("Dark Brown"),
  Tan: swatch("Tan"),
  Chocolate: swatch("Chocolate"),
  Fawn: swatch("Fawn"),
  Yellow: swatch("Yellow"),
  Green: swatch("Green"),
  Pink: swatch("Pink"),
  "Orange Tabby": swatch("Orange"),
  // Combinations
  "Red / Tan": swatch("Red", "Tan"),
  "Black & Tan": swatch("Black", "Tan"),
  "White & Black": swatch("White", "Black"),
  "White & Brown": swatch("White", "Brown"),
  "Black & Red": swatch("Black", "Red"),
  "Black & White": swatch("Black", "White"),
  "Red & White": swatch("Red", "White"),
  "Tan & White": swatch("Tan", "White"),
  "Sable & White": swatch("Sable", "White"),
  "Grey / Tuxedo": swatch("Grey", "White"),
  Speckled: swatch("Brown", "Light Cream"),
  Brindle: swatch("Brown", "Black"),
  "Mallard (green / brown)": swatch("Mallard Green", "Brown"),
  "Light Grey / Pink-Grey": swatch("Light Grey", "Pink Grey"),
  Calico: swatch("White", "Orange", "Black"),
  "Painted (multicolour)": swatch("Red", "Yellow", "Blue"),
  "Tricolour (black / tan / white)": swatch("Black", "Tan", "White")
};

export type SeedSpecies = {
  name: string;
  slug: string;
  // Species with the same group key share one colour list.
  group: string;
  // Shown directly to the customer, and pre-selected.
  defaults: string[];
  // Kept under "Other colours" until the customer opens it.
  additional?: string[];
  poseLabel?: string;
  poses?: string[];
};

// In storefront display order. Admin can reorder afterwards; this is only the starting state.
export const SEED_SPECIES: SeedSpecies[] = [
  {
    name: "Cat",
    slug: "cat",
    group: "cat",
    defaults: ["Orange Tabby", "Black", "White", "Grey / Tuxedo"],
    additional: ["Yellow", "Calico"]
  },
  {
    name: "Dachshund",
    slug: "dachshund",
    group: "dachshund",
    defaults: ["Red / Tan", "Black & Tan", "Chocolate", "Dark Tan", "Light Tan", "Light Cream"]
  },
  {
    name: "Shih Tzu / Poodle",
    slug: "shih-tzu-poodle",
    group: "shih-tzu-poodle",
    defaults: ["White", "Black", "Dark Tan", "Light Tan", "Light Cream"]
  },
  // Basset Hound, Beagle, French Bulldog / Boston Terrier and Corgi are one
  // "Other dogs" entry. The kind of dog is picked with the breed selector, which
  // reuses the pose mechanism; the colours are all of theirs together.
  {
    name: "Other dogs",
    slug: "other-dogs",
    group: "other-dogs",
    defaults: [
      "Tan & White",
      "Tricolour (black / tan / white)",
      "Red & White",
      "Sable & White",
      "Fawn",
      "Black & White",
      "Brindle"
    ],
    poseLabel: "Breed",
    poses: ["Basset Hound", "Beagle", "French Bulldog / Boston Terrier", "Corgi"]
  },
  {name: "Horse", slug: "horse", group: "horse", defaults: ["Brown", "Black", "White", "Chestnut", "Grey"]},
  {
    name: "Cow",
    slug: "cow",
    group: "cow",
    defaults: ["White & Black", "White & Brown", "White"],
    additional: ["Brown", "Black"],
    poseLabel: "View",
    poses: ["Front", "Side"]
  },
  {
    name: "Rabbit",
    slug: "rabbit",
    group: "rabbit",
    defaults: ["White", "Brown", "Grey"],
    additional: ["Pink"],
    poseLabel: "Pose",
    poses: ["Standing", "Sitting"]
  },
  {
    name: "Chicken",
    slug: "chicken",
    group: "chicken",
    defaults: ["White", "Brown", "Black"],
    additional: ["Red", "Speckled", "Black & Red"]
  },
  {
    name: "Duck",
    slug: "duck",
    group: "duck",
    defaults: ["Mallard (green / brown)", "White", "Brown"],
    additional: ["Green", "Painted (multicolour)"]
  },
  {name: "Dove", slug: "dove", group: "dove", defaults: ["White", "Grey"], additional: ["Blue"]},
  {name: "Deer", slug: "deer", group: "deer", defaults: ["Light Brown", "Dark Brown"]},
  {name: "Monkey", slug: "monkey", group: "monkey", defaults: ["Brown", "Tan", "Grey"]},
  // Koala and Kangaroo share one colour list: single colours only.
  {name: "Koala", slug: "koala", group: "kangaroo-koala", defaults: ["Dark Tan", "Light Tan", "Grey"]},
  {name: "Kangaroo", slug: "kangaroo", group: "kangaroo-koala", defaults: ["Dark Tan", "Light Tan", "Grey"]},
  {name: "Giraffe", slug: "giraffe", group: "giraffe", defaults: ["Light Tan", "Dark Tan"]},
  {
    name: "Elephant",
    slug: "elephant",
    group: "elephant",
    defaults: ["Grey", "Blue", "Dark Tan", "Light Tan", "Light Cream"],
    additional: ["Light Grey / Pink-Grey"],
    poseLabel: "View",
    poses: ["Front", "Side"]
  }
];

// Animals small enough to be carried (held) as well as sit on their own: dogs, cats, birds
// and rabbits. These get a "Carried" or "On its own" choice. Admin can change it per animal.
export const CARRYABLE_SLUGS = ["cat", "dachshund", "shih-tzu-poodle", "other-dogs", "chicken", "duck", "dove", "rabbit"];

// Colours taken out of the lists above. The refine script removes these from an
// existing database; nothing else is ever deleted by it.
export const REMOVED_COLOURS: {group: string; labels: string[]}[] = [
  {group: "horse", labels: ["Grey / Dapple"]},
  {group: "shih-tzu-poodle", labels: ["Apricot / Tan"]},
  {group: "kangaroo-koala", labels: ["Red / Brown", "Grey-Brown"]}
];

// The 25 photographs in /public/animals, filed as an unassigned library. The
// captions come from the filenames the owner chose; nothing is matched to a
// species automatically. Admin places each photo by hand.
export const SEED_IMAGE_FILES = [
  "buncha-dogs",
  "cat-lay",
  "cat-loaf",
  "cat-stand",
  "chicken",
  "chickens",
  "cow-front",
  "cow-side",
  "dachshund",
  "dachshunds",
  "deer",
  "doves",
  "ducks",
  "elephant-front",
  "elephant-side",
  "giraffe",
  "hen-and-chick",
  "horse-dark-brown",
  "horse-light-brown",
  "kangaroo-koala",
  "kangaroos",
  "monkey",
  "rabbit-loaf",
  "rabbit-stand",
  "shihtzu-poodle"
];
