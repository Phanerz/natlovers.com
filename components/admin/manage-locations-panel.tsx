"use client";

import {ArrowDown, ArrowUp, House, Pencil, Power} from "lucide-react";
import {distanceKm} from "@/lib/distance";
import type {AdminLocation} from "./location-types";

function Row({
  location,
  onEdit,
  onToggleActive,
  onMove,
  distanceKm: kmAway,
  isFirst,
  isLast,
  busy
}: {
  location: AdminLocation;
  distanceKm: number | null;
  onEdit: (location: AdminLocation) => void;
  onToggleActive: (location: AdminLocation) => void;
  onMove: (location: AdminLocation, direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 rounded-xl border border-[#e7ddc6] px-4 py-3.5 transition-colors duration-150 ${
        location.isActive ? "bg-[#fffdf9] hover:bg-[#f6efdd]" : "bg-[#f2ede2] opacity-70"
      }`}
    >
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={isFirst || busy}
          onClick={() => onMove(location, "up")}
          aria-label={`Move ${location.name} up`}
          className="flex h-5 w-5 items-center justify-center text-forest-500 disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={isLast || busy}
          onClick={() => onMove(location, "down")}
          aria-label={`Move ${location.name} down`}
          className="flex h-5 w-5 items-center justify-center text-forest-500 disabled:opacity-30"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-900 text-[11px] font-semibold text-sand-50">
        {location.displayOrder}
      </span>

      <House className="h-4 w-4 shrink-0 text-forest-500" />

      <div className="min-w-[10rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-display text-base text-forest-900">{location.name}</p>
          <span className="rounded-full bg-[#e3e8d4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#3a4526]">
            {location.type === "main_studio" ? "Main Studio" : "Stockist"}
          </span>
          {!location.isActive ? (
            <span className="rounded-full bg-[#e6e0d8] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-500">
              Inactive
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-forest-500">
          {location.addressLine1}
          {location.addressLine2 ? `, ${location.addressLine2}` : ""}
        </p>
      </div>

      {kmAway != null ? (
        <p className="shrink-0 text-right text-sm text-forest-700">
          <span className="font-display text-base text-forest-900">{kmAway < 10 ? kmAway.toFixed(1) : Math.round(kmAway).toLocaleString("en-US")}</span> km
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-forest-500">from the studio</span>
        </p>
      ) : null}

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onEdit(location)}
          aria-label={`Edit ${location.name}`}
          className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleActive(location)}
          aria-label={location.isActive ? `Deactivate ${location.name}` : `Activate ${location.name}`}
          className={`glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-50 ${
            location.isActive ? "is-danger text-red-600" : "text-forest-700"
          }`}
        >
          <Power className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ManageLocationsPanel({
  locationList,
  loading,
  onEdit,
  onToggleActive,
  onMove,
  onSortByDistance,
  busyId
}: {
  locationList: AdminLocation[];
  loading: boolean;
  onEdit: (location: AdminLocation) => void;
  onToggleActive: (location: AdminLocation) => void;
  onMove: (location: AdminLocation, direction: "up" | "down") => void;
  onSortByDistance: () => void;
  busyId: string | null;
}) {
  const studio = locationList.find((location) => location.type === "main_studio") ?? null;
  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-forest-900">Locations ({locationList.length})</h2>
        <button
          type="button"
          disabled={busyId === "sort"}
          onClick={onSortByDistance}
          className="glass-btn-secondary rounded-full px-5 py-2 text-sm font-semibold text-forest-900 disabled:opacity-60"
        >
          {busyId === "sort" ? "Sorting..." : "Sort by distance from the studio"}
        </button>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading locations...</p>
      ) : locationList.length ? (
        <div className="space-y-2.5">
          {locationList.map((location, index) => (
            <Row
              key={location.id}
              location={location}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onMove={onMove}
              distanceKm={studio && studio.id !== location.id ? distanceKm(studio.latitude, studio.longitude, location.latitude, location.longitude) : null}
              isFirst={index === 0}
              isLast={index === locationList.length - 1}
              busy={busyId === location.id}
            />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No locations yet.</p>
      )}
    </div>
  );
}
