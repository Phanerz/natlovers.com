// Starting data for the add-on system, from the species and colour list Anita
// provided. Names, defaults and the pose variants are hers. The hex values are
// an approximation for the swatches, to be tuned in admin by eye against the
// real felt. Nothing here is read by the storefront: scripts/seed-addons.ts
// copies it into the database once, and admin owns it from then on.

export type SeedColour = {kind: "solid" | "two_tone" | "gradient"; hexes: string[]};

export const SEED_COLOURS: Record<string, SeedColour> = {
  Brown: {kind: "solid", hexes: ["#7a4e2d"]},
  Black: {kind: "solid", hexes: ["#2a2523"]},
  White: {kind: "solid", hexes: ["#f4efe6"]},
  Chestnut: {kind: "solid", hexes: ["#8c3f22"]},
  "Grey / Dapple": {kind: "gradient", hexes: ["#9a9a98", "#c9c6c0"]},
  "Light Brown": {kind: "solid", hexes: ["#b58a5a"]},
  "Dark Brown": {kind: "solid", hexes: ["#4b2e1c"]},
  Tan: {kind: "solid", hexes: ["#c9a37a"]},
  Grey: {kind: "solid", hexes: ["#9b9b98"]},
  "Red / Tan": {kind: "two_tone", hexes: ["#a8482a", "#d1a77a"]},
  "Black & Tan": {kind: "two_tone", hexes: ["#2a2523", "#c28a52"]},
  Chocolate: {kind: "solid", hexes: ["#4a2c20"]},
  "White & Black": {kind: "two_tone", hexes: ["#f4efe6", "#2a2523"]},
  "White & Brown": {kind: "two_tone", hexes: ["#f4efe6", "#7a4e2d"]},
  Red: {kind: "solid", hexes: ["#a63a2a"]},
  Speckled: {kind: "gradient", hexes: ["#8a6a4a", "#d8c8b0"]},
  "Orange Tabby": {kind: "solid", hexes: ["#d98a3d"]},
  "Grey / Tuxedo": {kind: "two_tone", hexes: ["#8f8f8d", "#f4efe6"]},
  Yellow: {kind: "solid", hexes: ["#e2bd4a"]},
  Calico: {kind: "gradient", hexes: ["#f4efe6", "#d98a3d", "#2a2523"]},
  "Mallard (green / brown)": {kind: "two_tone", hexes: ["#3d6b4a", "#8a6a4a"]},
  Green: {kind: "solid", hexes: ["#4f7a4f"]},
  "Painted (multicolour)": {kind: "gradient", hexes: ["#d9694a", "#e2bd4a", "#4f7a9a"]},
  "Light Tan": {kind: "solid", hexes: ["#d9bf94"]},
  "Dark Tan": {kind: "solid", hexes: ["#a67c4e"]},
  "Red / Brown": {kind: "two_tone", hexes: ["#a8482a", "#7a4e2d"]},
  "Grey-Brown": {kind: "two_tone", hexes: ["#9b9b98", "#7a5e45"]},
  Blue: {kind: "solid", hexes: ["#8aa6bd"]},
  Pink: {kind: "solid", hexes: ["#e3a9b0"]},
  "Light Grey / Pink-Grey": {kind: "two_tone", hexes: ["#c4c2c0", "#d4b8b8"]},
  "Apricot / Tan": {kind: "solid", hexes: ["#d9a679"]},
  "Tan & White": {kind: "two_tone", hexes: ["#c9a37a", "#f4efe6"]},
  "Tricolour (black / tan / white)": {kind: "gradient", hexes: ["#2a2523", "#c28a52", "#f4efe6"]},
  "Red & White": {kind: "two_tone", hexes: ["#a8482a", "#f4efe6"]},
  Fawn: {kind: "solid", hexes: ["#d4aa78"]},
  "Black & White": {kind: "two_tone", hexes: ["#2a2523", "#f4efe6"]},
  Brindle: {kind: "gradient", hexes: ["#6b4a30", "#2a2523"]},
  "Sable & White": {kind: "two_tone", hexes: ["#a8723f", "#f4efe6"]},
  Tricolour: {kind: "gradient", hexes: ["#2a2523", "#c28a52", "#f4efe6"]}
};

export type SeedSpecies = {
  name: string;
  slug: string;
  // Species with the same group key share one colour list.
  group: string;
  defaults: string[];
  additional?: string[];
  poseLabel?: string;
  poses?: string[];
};

export const SEED_SPECIES: SeedSpecies[] = [
  {name: "Horse", slug: "horse", group: "horse", defaults: ["Brown", "Black", "White"], additional: ["Chestnut", "Grey / Dapple"]},
  {name: "Deer", slug: "deer", group: "deer", defaults: ["Light Brown", "Dark Brown"]},
  {name: "Monkey", slug: "monkey", group: "monkey", defaults: ["Brown", "Tan", "Grey"]},
  {name: "Dachshund", slug: "dachshund", group: "dachshund", defaults: ["Red / Tan", "Black & Tan", "Chocolate"]},
  {
    name: "Cow",
    slug: "cow",
    group: "cow",
    defaults: ["White & Black", "White & Brown"],
    additional: ["Brown", "Black"],
    poseLabel: "View",
    poses: ["Front", "Side"]
  },
  {name: "Chicken", slug: "chicken", group: "chicken", defaults: ["White", "Brown", "Black"], additional: ["Red", "Speckled"]},
  {
    name: "Cat",
    slug: "cat",
    group: "cat",
    defaults: ["Orange Tabby", "Black", "White", "Grey / Tuxedo"],
    additional: ["Yellow", "Calico"]
  },
  {
    name: "Duck",
    slug: "duck",
    group: "duck",
    defaults: ["Mallard (green / brown)", "White", "Brown"],
    additional: ["Green", "Painted (multicolour)"]
  },
  {name: "Giraffe", slug: "giraffe", group: "giraffe", defaults: ["Light Tan", "Dark Tan"]},
  {name: "Kangaroo", slug: "kangaroo", group: "kangaroo-koala", defaults: ["Grey", "Red / Brown"], additional: ["Grey-Brown"]},
  {name: "Koala", slug: "koala", group: "kangaroo-koala", defaults: ["Grey", "Grey-Brown"], additional: ["Red / Brown"]},
  {name: "Dove", slug: "dove", group: "dove", defaults: ["White", "Grey"], additional: ["Blue"]},
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
    name: "Elephant",
    slug: "elephant",
    group: "elephant",
    defaults: ["Grey"],
    additional: ["Light Grey / Pink-Grey"],
    poseLabel: "View",
    poses: ["Front", "Side"]
  },
  {name: "Shih Tzu / Poodle", slug: "shih-tzu-poodle", group: "shih-tzu-poodle", defaults: ["White", "Apricot / Tan", "Black"]},
  {
    name: "Basset Hound",
    slug: "basset-hound",
    group: "basset-hound",
    defaults: ["Tan & White", "Tricolour (black / tan / white)"]
  },
  {name: "Beagle", slug: "beagle", group: "beagle", defaults: ["Tricolour (black / tan / white)", "Red & White"]},
  {
    name: "French Bulldog / Boston Terrier",
    slug: "french-bulldog-boston-terrier",
    group: "french-bulldog-boston-terrier",
    defaults: ["Fawn", "Black & White", "Brindle"]
  },
  {name: "Corgi", slug: "corgi", group: "corgi", defaults: ["Red & White", "Sable & White", "Tricolour"]}
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
