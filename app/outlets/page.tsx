import {OutletsPageContent} from "@/components/outlets/outlets-page-content";
import {getActiveLocations} from "@/lib/locations";

// Server-fetched, same reasoning as the catalogue page's own fix this
// session: the location list and its map both need the real, current data
// on first paint, not a client fetch waterfall after an empty shell loads.
export const dynamic = "force-dynamic";

export default async function OutletsPage() {
  const locationList = await getActiveLocations();

  return (
    <main className="page-enter">
      <OutletsPageContent locationList={locationList} />
    </main>
  );
}
