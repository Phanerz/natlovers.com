"use client";

import {useEffect, useMemo} from "react";
import {MapContainer, Marker, Popup, TileLayer, useMap} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {PublicLocation} from "@/lib/locations";

// A small inline flower glyph for the main studio's pin, standing in for
// the numbered circle every stockist pin uses  -  built by hand as an SVG
// string rather than through React, since Leaflet's divIcon takes raw HTML,
// not a component tree.
const FLOWER_GLYPH = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="2.4" fill="#fbf8f1" />
    <circle cx="12" cy="6" r="2.6" fill="#fbf8f1" opacity="0.92" />
    <circle cx="12" cy="18" r="2.6" fill="#fbf8f1" opacity="0.92" />
    <circle cx="6" cy="12" r="2.6" fill="#fbf8f1" opacity="0.92" />
    <circle cx="18" cy="12" r="2.6" fill="#fbf8f1" opacity="0.92" />
  </svg>
`;

function pinIcon(displayOrder: number, isMainStudio: boolean, isHighlighted: boolean) {
  const size = isHighlighted ? 34 : 28;
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 999px;
        background: #172015;
        border: 2px solid #fbf8f1;
        box-shadow: 0 2px 8px rgba(0,0,0,0.28);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fbf8f1;
        font-family: 'Trebuchet MS', sans-serif;
        font-size: 12px;
        font-weight: 600;
        transition: width 0.15s ease, height 0.15s ease;
      ">${isMainStudio ? FLOWER_GLYPH : displayOrder}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2]
  });
}

// Fits the map to every active location on mount and whenever the location
// set changes, biased toward however the actual coordinates cluster (Java
// and Bali, per the reference) rather than a hardcoded center/zoom that
// would need editing every time a location is added or removed.
function FitBounds({locationList}: {locationList: PublicLocation[]}) {
  const map = useMap();

  useEffect(() => {
    if (!locationList.length) return;
    const bounds = L.latLngBounds(locationList.map((location) => [location.latitude, location.longitude]));
    map.fitBounds(bounds, {padding: [48, 48], maxZoom: 11});
  }, [map, locationList]);

  return null;
}

export function OutletsMapInner({
  locationList,
  highlightedId,
  onMarkerSelect
}: {
  locationList: PublicLocation[];
  highlightedId: string | null;
  onMarkerSelect?: (id: string) => void;
}) {
  const center = useMemo<[number, number]>(() => {
    if (!locationList.length) return [-2.5, 118];
    return [locationList[0].latitude, locationList[0].longitude];
  }, [locationList]);

  return (
    <MapContainer center={center} zoom={5} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds locationList={locationList} />
      {locationList.map((location) => (
        <Marker
          key={location.id}
          position={[location.latitude, location.longitude]}
          icon={pinIcon(location.displayOrder, location.type === "main_studio", highlightedId === location.id)}
          eventHandlers={onMarkerSelect ? {click: () => onMarkerSelect(location.id)} : undefined}
        >
          <Popup>
            <p style={{fontWeight: 600, margin: 0}}>{location.name}</p>
            <p style={{margin: "2px 0 0", fontSize: "12px", color: "#5c5c50"}}>{location.addressLine1}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
