"use client";

import {useEffect, useRef, useState} from "react";
import {MapContainer, Marker, TileLayer, Tooltip, useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {PublicLocation} from "@/lib/locations";
import type {OutletsMapProps} from "./outlets-map";

// Every marker is the same house pictogram, sized by type so the studio
// reads bigger than a stockist at a glance. Colour carries the type too:
// stockists are white badges, the main studio is gold. The look lives in
// .outlet-pin (app/globals.css) so the selected pin can pulse.
const HOUSE_PATH = "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z";

const ZOOM_ON_LOCATION = 16;

function houseIcon(type: "main_studio" | "stockist", active: boolean) {
  const outer = type === "main_studio" ? 36 : 26;
  const glyph = type === "main_studio" ? 20 : 14;
  return L.divIcon({
    className: "",
    html: `
      <div class="outlet-pin outlet-pin--${type === "main_studio" ? "main" : "stockist"}${active ? " is-active" : ""}" style="width:${outer}px;height:${outer}px;">
        <svg width="${glyph}" height="${glyph}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="${HOUSE_PATH}" fill="currentColor" />
        </svg>
      </div>
    `,
    iconSize: [outer, outer],
    iconAnchor: [outer / 2, outer / 2],
    tooltipAnchor: [0, -outer / 2]
  });
}

type TileMode = "map" | "satellite";

const TILE_LAYERS: Record<TileMode, {url: string; attribution: string}> = {
  map: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  // Esri World Imagery: free, no API key or billing account, same
  // no-liability reasoning as the OSM choice. Attribution text is Esri's
  // own required credit line for this layer.
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  }
};

// Same liquid-glass pill language as the navbar and the catalogue category
// tabs, not Leaflet's default boxy layer-list control: a translucent glass
// track (.liquid-glass-on-light) housing a static glass pill (.liquid-glass-
// dark  -  no drag here, just two options, so no need for the JS-measured
// sliding indicator the tabs use) on whichever option is active.
function MapControls({
  mode,
  onChange,
  onShowAll
}: {
  mode: TileMode;
  onChange: (mode: TileMode) => void;
  onShowAll?: () => void;
}) {
  return (
    <div className="leaflet-top leaflet-left" style={{marginTop: "10px", marginLeft: "50px"}}>
      <div className="flex items-center gap-2">
        <div className="leaflet-control liquid-glass-on-light flex overflow-hidden rounded-full p-1 backdrop-blur-[18px] backdrop-saturate-[160%]">
          {(["map", "satellite"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors duration-150 ${
                mode === option
                  ? "liquid-glass-dark text-sand-50 backdrop-blur-[14px] backdrop-saturate-[160%]"
                  : "text-forest-700 hover:bg-[#34433212]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        {onShowAll ? (
          <div className="leaflet-control liquid-glass-on-light flex overflow-hidden rounded-full p-1 backdrop-blur-[18px] backdrop-saturate-[160%]">
            <button
              type="button"
              onClick={onShowAll}
              className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-forest-700 transition-colors duration-150 hover:bg-[#34433212]"
            >
              Show all
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Flies to the selected location whenever the selection changes, or the
// selected card / pin is clicked again (tick). Skips the very first run: the
// map already mounts centred on the first location.
function FlyToActive({location, tick}: {location: PublicLocation; tick: number}) {
  const map = useMap();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    map.flyTo([location.latitude, location.longitude], ZOOM_ON_LOCATION, {duration: 1.3});
  }, [map, location.id, location.latitude, location.longitude, tick]);

  return null;
}

function FitAll({locationList, tick}: {locationList: PublicLocation[]; tick: number}) {
  const map = useMap();

  useEffect(() => {
    if (tick === 0 || locationList.length < 2) return;
    const bounds = L.latLngBounds(locationList.map((location) => [location.latitude, location.longitude]));
    map.flyToBounds(bounds, {padding: [48, 48], maxZoom: 14, duration: 1.4});
  }, [map, locationList, tick]);

  return null;
}

// The page's layout changes size (mobile <-> desktop, dev-tools resize), and
// Leaflet only re-measures its container when told to.
function KeepSized() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function OutletsMapInner({
  locationList,
  activeIndex = 0,
  focusTick = 0,
  showAllTick = 0,
  onSelect,
  onShowAll
}: OutletsMapProps) {
  const [tileMode, setTileMode] = useState<TileMode>("map");
  const tile = TILE_LAYERS[tileMode];
  const activeLocation = locationList[activeIndex] ?? locationList[0];

  return (
    <MapContainer
      center={[activeLocation.latitude, activeLocation.longitude]}
      zoom={ZOOM_ON_LOCATION}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer key={tileMode} attribution={tile.attribution} url={tile.url} />
      <MapControls mode={tileMode} onChange={setTileMode} onShowAll={locationList.length > 1 ? onShowAll : undefined} />
      <KeepSized />
      <FlyToActive location={activeLocation} tick={focusTick} />
      <FitAll locationList={locationList} tick={showAllTick} />
      {locationList.map((location, index) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={houseIcon(location.type, index === activeIndex)}
          zIndexOffset={index === activeIndex ? 1000 : location.type === "main_studio" ? 500 : 0}
          eventHandlers={{click: () => onSelect?.(index)}}
        >
          <Tooltip direction="top" offset={[0, -2]}>
            {location.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
