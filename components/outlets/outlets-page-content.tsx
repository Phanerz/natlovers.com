"use client";

import {useState} from "react";
import {ChevronRight, Flower2, House, MapPin, Palette, ShoppingBag, ShoppingBasket} from "lucide-react";
import type {PublicLocation} from "@/lib/locations";
import type {LocationIcon} from "@/lib/location-constants";
import {OutletsMap} from "./outlets-map";

const iconComponents: Record<LocationIcon, typeof Flower2> = {
  flower: Flower2,
  shopping_bag: ShoppingBag,
  palette: Palette,
  house: House,
  basket: ShoppingBasket
};

function LocationRow({
  location,
  highlighted,
  onSelect
}: {
  location: PublicLocation;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const Icon = iconComponents[location.icon];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card flex w-full items-start gap-3.5 p-4 text-left transition-colors duration-150 sm:gap-4 sm:p-5 ${
        highlighted ? "bg-[#f3ecda]" : "hover:bg-[#f8f2e2]"
      }`}
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-900 text-[11px] font-semibold text-sand-50">
        {location.displayOrder}
      </span>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base text-forest-900">{location.name}</span>
          <span className="rounded-full bg-[#e3e8d4] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3a4526]">
            {location.type === "main_studio" ? "Main Studio" : "Stockist"}
          </span>
        </span>
        <span className="mt-1.5 block text-sm leading-relaxed text-forest-600">
          {location.addressLine1}
          {location.addressLine2 ? `, ${location.addressLine2}` : ""}
        </span>
        {location.hoursDisplay ? <span className="mt-1 block text-sm font-medium text-forest-500">{location.hoursDisplay}</span> : null}
      </span>
      <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-forest-400" />
    </button>
  );
}

export function OutletsPageContent({locationList}: {locationList: PublicLocation[]}) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="space-y-3">
        {locationList.map((location) => (
          <LocationRow
            key={location.id}
            location={location}
            highlighted={highlightedId === location.id}
            onSelect={() => setHighlightedId(location.id)}
          />
        ))}

        <div className="card flex items-center justify-center gap-2 p-4 text-sm text-forest-500">
          <MapPin className="h-4 w-4" />
          More locations coming soon
        </div>
      </div>

      <div className="card h-[420px] overflow-hidden p-0 lg:sticky lg:top-6 lg:h-[600px]">
        <OutletsMap locationList={locationList} highlightedId={highlightedId} onMarkerSelect={setHighlightedId} />
      </div>
    </div>
  );
}
