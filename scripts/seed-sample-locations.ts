import {eq} from "drizzle-orm";
import {db, locations} from "../lib/db";

// The Main Studio entry is real (same address already used on the
// homepage's outlets section, components/outlets-content.tsx). The four
// stockist entries are invented examples modeled on the reference mockup
// for this page, there is no real stockist-partner list anywhere in this
// codebase to seed from. Their coordinates are real, geocoded against the
// actual named streets via Nominatim (some resolved to exact house-number
// precision, others to street/village level where the exact number wasn't
// in OSM's data), the store names themselves are not.
const SAMPLE_LOCATIONS = [
  {
    name: "Natlovers Workshop & Showroom",
    type: "main_studio" as const,
    icon: "flower" as const,
    addressLine1: "Jl. Tata Bumi Selatan No.107, Banyuraden",
    addressLine2: "Gamping, Sleman, Yogyakarta",
    latitude: -7.7889838,
    longitude: 110.3357597,
    hoursDisplay: "Open by appointment",
    displayOrder: 1
  },
  {
    name: "Bumi Handmade Store",
    type: "stockist" as const,
    icon: "shopping_bag" as const,
    addressLine1: "Jl. Malioboro No.52, Ngupasan",
    addressLine2: "Gondomanan, Yogyakarta",
    latitude: -7.7932485,
    longitude: 110.3657751,
    hoursDisplay: "Open . 09:00 - 21:00 WIB",
    displayOrder: 2
  },
  {
    name: "Lokal Collection",
    type: "stockist" as const,
    icon: "palette" as const,
    addressLine1: "Jl. Kemang Raya No.36, Bangka",
    addressLine2: "Mampang Prapatan, Jakarta Selatan",
    latitude: -6.2730155,
    longitude: 106.815122,
    hoursDisplay: "Open . 10:00 - 22:00 WIB",
    displayOrder: 3
  },
  {
    name: "House of Uluwatu",
    type: "stockist" as const,
    icon: "house" as const,
    addressLine1: "Jl. Labuan Sait No.27, Pecatu",
    addressLine2: "Kuta Selatan, Bali",
    latitude: -8.83152,
    longitude: 115.1261096,
    hoursDisplay: "Open . 09:00 - 20:00 WITA",
    displayOrder: 4
  },
  {
    name: "Crafted Living",
    type: "stockist" as const,
    icon: "basket" as const,
    addressLine1: "Jl. Sunset Road No.88, Kuta",
    addressLine2: "Badung, Bali",
    latitude: -8.7014186,
    longitude: 115.1792852,
    hoursDisplay: "Open . 10:00 - 21:00 WITA",
    displayOrder: 5
  }
];

async function main() {
  for (const sample of SAMPLE_LOCATIONS) {
    const [existing] = await db.select({id: locations.id}).from(locations).where(eq(locations.name, sample.name));
    if (existing) {
      console.log(`Skipping "${sample.name}", already exists.`);
      continue;
    }
    await db.insert(locations).values({...sample, isActive: true});
    console.log(`Inserted "${sample.name}".`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
