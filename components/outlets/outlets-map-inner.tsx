"use client";

import {MapContainer, Marker, Popup, TileLayer} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Same flower glyph the full Outlets/admin build (feature/outlets-page-admin)
// uses for a main studio pin, kept here as a plain SVG string since
// Leaflet's divIcon takes raw HTML, not a component tree. Only one pin
// exists on this page right now (the real studio), so there is no numbered
// variant to also support.
const FLOWER_GLYPH = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="2.4" fill="#fbf8f1" />
    <circle cx="12" cy="6" r="2.6" fill="#fbf8f1" opacity="0.92" />
    <circle cx="12" cy="18" r="2.6" fill="#fbf8f1" opacity="0.92" />
    <circle cx="6" cy="12" r="2.6" fill="#fbf8f1" opacity="0.92" />
    <circle cx="18" cy="12" r="2.6" fill="#fbf8f1" opacity="0.92" />
  </svg>
`;

const studioIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: #172015;
      border: 2px solid #fbf8f1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.28);
      display: flex;
      align-items: center;
      justify-content: center;
    ">${FLOWER_GLYPH}</div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

export function OutletsMapInner({
  name,
  address,
  latitude,
  longitude
}: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}) {
  return (
    <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} icon={studioIcon}>
        <Popup>
          <p style={{fontWeight: 600, margin: 0}}>{name}</p>
          <p style={{margin: "2px 0 0", fontSize: "12px", color: "#5c5c50"}}>{address}</p>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
