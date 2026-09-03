"use client";

import {useState} from "react";
import {MapContainer, Marker, Popup, TileLayer} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Root cause of the "crosshair" marker this replaces: the old icon was five
// same-size, same-color circles in a plus-sign layout (center + N/S/E/W).
// At 32px that reads as a targeting reticle, not a flower - confirmed by
// inspecting the live DOM, only one marker element existed and it matched
// this exact icon, no stray Leaflet control involved. Replaced with a real
// house-silhouette pictogram (roof + walls + a door notch), the brand's
// dark forest green (#172015, same shade already used for glass-btn-primary
// and every existing pin) on a cream badge, at two sizes so HQ reads bigger
// than a stockist pin at a glance.
const HOUSE_PATH = "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z";

function houseIcon(size: "hq" | "stockist") {
  const outer = size === "hq" ? 36 : 26;
  const glyph = size === "hq" ? 20 : 14;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${outer}px;
        height: ${outer}px;
        border-radius: 999px;
        background: #fbf8f1;
        border: 2px solid #172015;
        box-shadow: 0 2px 8px rgba(0,0,0,0.28);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="${glyph}" height="${glyph}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="${HOUSE_PATH}" fill="#172015" />
        </svg>
      </div>
    `,
    iconSize: [outer, outer],
    iconAnchor: [outer / 2, outer / 2],
    popupAnchor: [0, -outer / 2]
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

// Flat two-segment pill, styled to match the rest of the site's toggle-pill
// pattern (e.g. the type/icon pickers in the admin location form) instead
// of Leaflet's default boxy layer-list control. Positioned as a plain
// absolutely-placed sibling over the map, DESIGN.md keeps map controls
// flat, no glass, so this is a solid cream surface with a 1px border.
function TileToggle({mode, onChange}: {mode: TileMode; onChange: (mode: TileMode) => void}) {
  return (
    <div className="leaflet-top leaflet-left" style={{marginTop: "10px", marginLeft: "50px"}}>
      <div className="leaflet-control flex overflow-hidden rounded-full border border-[#d4c5ab] bg-[#fffaf1] p-1 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        {(["map", "satellite"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors duration-150 ${
              mode === option ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-[#f0e7d4]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OutletsMapInner({
  name,
  address,
  type,
  latitude,
  longitude
}: {
  name: string;
  address: string;
  type: "main_studio" | "stockist";
  latitude: number;
  longitude: number;
}) {
  const [tileMode, setTileMode] = useState<TileMode>("map");
  const tile = TILE_LAYERS[tileMode];

  return (
    <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer key={tileMode} attribution={tile.attribution} url={tile.url} />
      <TileToggle mode={tileMode} onChange={setTileMode} />
      <Marker position={[latitude, longitude]} icon={houseIcon(type === "main_studio" ? "hq" : "stockist")}>
        <Popup>
          <p style={{fontWeight: 600, margin: 0}}>{name}</p>
          <p style={{margin: "2px 0 0", fontSize: "12px", color: "#5c5c50"}}>{address}</p>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
