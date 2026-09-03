"use client";

import dynamic from "next/dynamic";

// Leaflet touches window/document at import time, so it can only ever run
// client-side. next/dynamic's ssr: false has to live in a Client Component
// (Next disallows it directly inside a Server Component), which is the only
// reason this thin wrapper exists separately from outlets-map-inner.
const OutletsMapInner = dynamic(() => import("./outlets-map-inner").then((mod) => mod.OutletsMapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#f3ecda] text-sm text-forest-500">Loading map...</div>
  )
});

export function OutletsMap({
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
  return <OutletsMapInner name={name} address={address} type={type} latitude={latitude} longitude={longitude} />;
}
