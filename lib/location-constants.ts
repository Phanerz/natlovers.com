// Split out from lib/admin-locations.ts so client components (the location
// form's type/icon pickers) can import just the enum values without pulling
// in that file's `db` import, and the postgres package's Node-only
// dependencies (fs, etc.) along with it into the client bundle.
export type LocationType = "main_studio" | "stockist";
export type LocationIcon = "flower" | "shopping_bag" | "palette" | "house" | "basket";

export const locationTypes: LocationType[] = ["main_studio", "stockist"];
export const locationIcons: LocationIcon[] = ["flower", "shopping_bag", "palette", "house", "basket"];
