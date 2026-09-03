import {asc, eq} from "drizzle-orm";
import {db, locations} from "@/lib/db";
import type {LocationType} from "@/lib/location-constants";

export type PublicLocation = {
  id: string;
  name: string;
  type: LocationType;
  addressLine1: string;
  addressLine2: string | null;
  latitude: number;
  longitude: number;
  hoursDisplay: string | null;
  contact: string | null;
  displayOrder: number;
};

// Server-side only, called from app/outlets/page.tsx  -  no client fetch, so
// this can never reintroduce the waterfall the catalogue LCP fix already
// solved for. Only active locations, in displayOrder.
export async function getActiveLocations(): Promise<PublicLocation[]> {
  const rows = await db.select().from(locations).where(eq(locations.isActive, true)).orderBy(asc(locations.displayOrder));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type as LocationType,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    latitude: row.latitude,
    longitude: row.longitude,
    hoursDisplay: row.hoursDisplay,
    contact: row.contact,
    displayOrder: row.displayOrder
  }));
}
