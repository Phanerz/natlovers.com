"use client";

import {FormEvent, useState} from "react";
import {MapPin} from "lucide-react";
import {GlassToggle} from "./glass-toggle";
import {LocationFormState} from "./location-types";
import {LocationIcon, LocationType, locationIcons, locationTypes} from "@/lib/location-constants";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

const typeLabels: Record<LocationType, string> = {
  main_studio: "Main Studio",
  stockist: "Stockist"
};

const iconLabels: Record<LocationIcon, string> = {
  flower: "Flower",
  shopping_bag: "Shopping Bag",
  palette: "Palette",
  house: "House",
  basket: "Basket"
};

type GeocodePreview = {latitude: number; longitude: number; displayName: string} | null;

// Geocode-on-save rather than an embedded map-click picker: this reuses the
// same server-side Nominatim proxy the public map's data relies on being
// accurate, and it's a lot less to build correctly than a second Leaflet
// instance living inside a form (click handling, its own marker, its own
// SSR-disabled dynamic import). The preview step before the coordinates
// land in the form is the "confirmation" Section 4 asked for  -  nothing
// gets set until the admin looks at what Nominatim found and accepts it.
export function LocationForm({
  mode,
  form,
  onChange,
  onSubmit,
  submitting,
  errorMessage,
  onCancel
}: {
  mode: "create" | "edit";
  form: LocationFormState;
  onChange: (next: LocationFormState) => void;
  onSubmit: (event: FormEvent) => void;
  submitting: boolean;
  errorMessage: string | null;
  onCancel?: () => void;
}) {
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GeocodePreview>(null);

  const hasCoordinates = form.latitude.trim() !== "" && form.longitude.trim() !== "";

  async function handleFindOnMap() {
    if (!form.addressLine1.trim()) return;
    setGeocoding(true);
    setGeocodeError(null);
    setPreview(null);
    try {
      const query = [form.addressLine1, form.addressLine2].filter(Boolean).join(", ");
      const response = await fetch("/api/admin/locations/geocode", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({query})
      });
      const data = await response.json();
      if (!response.ok) {
        setGeocodeError(data?.error ?? "Could not find that address.");
        return;
      }
      setPreview(data);
    } catch {
      setGeocodeError("Could not reach the geocoder. Please try again.");
    } finally {
      setGeocoding(false);
    }
  }

  function acceptPreview() {
    if (!preview) return;
    onChange({...form, latitude: String(preview.latitude), longitude: String(preview.longitude)});
    setPreview(null);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-6 p-6 sm:p-8">
      <label className="block space-y-2 text-sm text-forest-700">
        <span className="muted">Name</span>
        <input
          value={form.name}
          onChange={(event) => onChange({...form, name: event.target.value})}
          required
          placeholder='e.g. "Bumi Handmade Store"'
          className={fieldClass}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="muted block text-sm text-forest-700">Type</span>
          <div className="flex flex-wrap gap-2">
            {locationTypes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChange({...form, type: option})}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150 ${
                  form.type === option ? "bg-forest-900 text-sand-50" : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
                }`}
              >
                {typeLabels[option]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="muted block text-sm text-forest-700">Icon</span>
          <div className="flex flex-wrap gap-2">
            {locationIcons.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChange({...form, icon: option})}
                className={`rounded-full px-3.5 py-2 text-xs font-medium transition-colors duration-150 ${
                  form.icon === option ? "bg-forest-900 text-sand-50" : "border border-[#d4c5ab] bg-[#fffaf1] text-forest-700 hover:bg-[#f0e7d4]"
                }`}
              >
                {iconLabels[option]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="block space-y-2 text-sm text-forest-700">
        <span className="muted">Address line 1</span>
        <input
          value={form.addressLine1}
          onChange={(event) => onChange({...form, addressLine1: event.target.value})}
          required
          placeholder="Street address"
          className={fieldClass}
        />
      </label>

      <label className="block space-y-2 text-sm text-forest-700">
        <span className="muted">Address line 2 (optional)</span>
        <input
          value={form.addressLine2}
          onChange={(event) => onChange({...form, addressLine2: event.target.value})}
          placeholder='e.g. "Gamping, Sleman, Yogyakarta"'
          className={fieldClass}
        />
      </label>

      <div className="space-y-3 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-forest-900">Map coordinates</p>
            <p className="text-xs text-forest-500">
              {hasCoordinates ? `${form.latitude}, ${form.longitude}` : "Not yet located."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleFindOnMap}
            disabled={!form.addressLine1.trim() || geocoding}
            className="glass-btn-primary flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MapPin className="h-3.5 w-3.5" />
            {geocoding ? "Finding..." : "Find on map"}
          </button>
        </div>

        {geocodeError ? <p className="text-sm text-red-600">{geocodeError}</p> : null}

        {preview ? (
          <div className="space-y-2 rounded-lg border border-[#cdbfa6] bg-[#f6efdd] p-3">
            <p className="text-sm text-forest-800">
              Found <span className="font-mono">{preview.latitude.toFixed(6)}, {preview.longitude.toFixed(6)}</span>
            </p>
            <p className="text-xs text-forest-500">{preview.displayName}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={acceptPreview}
                className="rounded-full bg-forest-900 px-4 py-1.5 text-xs font-semibold text-sand-50"
              >
                Use this location
              </button>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-4 py-1.5 text-xs font-medium text-forest-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {hasCoordinates ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-xs text-forest-500">
              <span>Latitude (fine-tune if needed)</span>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(event) => onChange({...form, latitude: event.target.value})}
                className="w-full rounded-md border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
              />
            </label>
            <label className="block space-y-1 text-xs text-forest-500">
              <span>Longitude (fine-tune if needed)</span>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(event) => onChange({...form, longitude: event.target.value})}
                className="w-full rounded-md border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
              />
            </label>
          </div>
        ) : null}
      </div>

      <label className="block space-y-2 text-sm text-forest-700">
        <span className="muted">Hours display (optional)</span>
        <input
          value={form.hoursDisplay}
          onChange={(event) => onChange({...form, hoursDisplay: event.target.value})}
          placeholder='e.g. "Open by appointment" or "Open . 09:00 - 21:00 WIB"'
          className={fieldClass}
        />
      </label>

      <div className="flex items-center justify-between rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-forest-900">Active</p>
          <p className="text-xs text-forest-500">Shown on the public Outlets page when on.</p>
        </div>
        <GlassToggle checked={form.isActive} onChange={(checked) => onChange({...form, isActive: checked})} label="Active" />
      </div>

      {errorMessage ? <p className="text-sm font-medium text-red-600">{errorMessage}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting || !hasCoordinates}
          className="glass-btn-primary flex-1 rounded-full px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : mode === "create" ? "Add location" : "Save changes"}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-6 py-4 text-base font-medium text-forest-700"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
