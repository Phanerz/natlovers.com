import {SectionHeading} from "@/components/section-heading";
import {OutletsPageContent} from "@/components/outlets/outlets-page-content";
import {getActiveLocations} from "@/lib/locations";

// Server-fetched, same reasoning as the catalogue page's own fix this
// session: the location list and its map both need the real, current data
// on first paint, not a client fetch waterfall after an empty shell loads.
export const dynamic = "force-dynamic";

export default async function OutletsPage() {
  const locationList = await getActiveLocations();

  return (
    <main className="shell page-enter space-y-8 py-10 sm:py-14">
      <SectionHeading
        eyebrow="Find Us"
        title="Visit the studio, or find Natlovers near you."
        body="Our workshop and showroom in Yogyakarta is open to visitors by appointment. We're steadily growing our list of stockist partners across Indonesia and beyond, and this page will keep expanding as new locations come online."
      />
      <OutletsPageContent locationList={locationList} />
    </main>
  );
}
