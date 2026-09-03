import {Clock, MapPin, MessageCircle} from "lucide-react";
import type {PublicLocation} from "@/lib/locations";
import {OutletsMap} from "./outlets-map";

// Plain deep link, not the Maps JS/Embed API - no key, no billing risk.
function googleMapsUrl(location: PublicLocation) {
  const address = [location.addressLine1, location.addressLine2].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function LocationCard({location}: {location: PublicLocation}) {
  return (
    <div className="card motion-card p-8 text-sm leading-7 text-forest-700">
      <p className="muted">{location.type === "main_studio" ? "Main Studio" : "Stockist"}</p>
      <h3 className="mt-2 font-display text-2xl text-forest-900">{location.name}</h3>
      <div className="mt-5 space-y-3">
        <p className="flex items-start gap-2">
          <MapPin className="mt-1 h-4 w-4 shrink-0" />
          <a
            href={googleMapsUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#cdbfa6] underline-offset-2 transition-colors duration-150 hover:text-forest-900"
          >
            {location.addressLine1}
            {location.addressLine2 ? `, ${location.addressLine2}` : ""}
          </a>
        </p>
        {location.hoursDisplay ? (
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" /> {location.hoursDisplay}
          </p>
        ) : null}
        {location.contact ? (
          <p className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0" /> {location.contact}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function OutletsPageContent({locationList}: {locationList: PublicLocation[]}) {
  const stockists = locationList.filter((location) => location.type === "stockist");

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        {locationList.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))}

        {stockists.length === 0 ? (
          <div className="card motion-card flex flex-col justify-center p-8 text-center text-sm leading-7 text-forest-700">
            <p className="muted">Stockist Partners</p>
            <p className="mt-3 font-display text-xl text-forest-900">More locations coming soon</p>
            <p className="mt-3">
              Interested in carrying Natlovers pieces at your store? Reach out through our socials and we&apos;ll follow up
              about wholesale and stockist partnerships.
            </p>
          </div>
        ) : null}
      </div>

      <div className="card h-[360px] overflow-hidden p-0 lg:sticky lg:top-6 lg:h-[520px]">
        <OutletsMap locationList={locationList} />
      </div>
    </div>
  );
}
