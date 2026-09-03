// Split out from lib/admin-locations.ts because that module imports
// lib/db (server-only, pulls in the postgres driver's Node built-ins like
// tls/net). A client component that only needs the LocationType enum was
// dragging that entire chain into the browser bundle through this constant
// - moving it here keeps client imports safe without needing `import type`
// everywhere a component also wants the runtime value.
export type LocationType = "main_studio" | "stockist";

export const locationTypes: LocationType[] = ["main_studio", "stockist"];
