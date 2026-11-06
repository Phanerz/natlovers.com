"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ArrowDown, ArrowUp, Check, Crop, Eye, EyeOff, Plus, Trash2, Upload, X} from "lucide-react";
import {addonSwatchBackground, type AddonColourKind, type AddonColourView, type AddonSpeciesView} from "@/lib/addon-shared";

// The Add-ons admin page: price and limit, the animals (with their colours, poses and
// photos), the shared colour palette, and the photo library. Every surface here uses the
// site's themed card and field styles, so it reads the same in light and dark.

type LibraryImage = {
  id: string;
  url: string;
  caption: string | null;
  speciesId: string | null;
  poseId: string | null;
  colourId: string | null;
  zoom: number;
  isPrimary: boolean;
};

type PaletteColour = {id: string; name: string; hex: string};

type AdminData = {
  settings: {priceIdr: number; priceUsdCents: number; maxPerBag: number};
  species: AddonSpeciesView[];
  palette: PaletteColour[];
  groups: {id: string; name: string}[];
  library: LibraryImage[];
};

type Send = (body: Record<string, unknown>) => Promise<boolean>;

const KIND_LABELS: Record<AddonColourKind, string> = {solid: "One colour", two_tone: "Two colours", three_tone: "Three colours"};
const fieldClass = "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-3 py-2.5 text-sm text-forest-900 outline-none focus:border-forest-400";
const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#d4c5ab] bg-white px-3 py-2 text-sm font-medium text-forest-900 transition-colors hover:border-forest-400 disabled:opacity-50";
const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";
const labelClass = "text-xs font-semibold uppercase tracking-wide text-forest-600";
const titleClass = "font-display text-xl text-forest-900";
const helpClass = "text-sm text-forest-600";
const chip = "flex items-center gap-2 rounded-full border border-[#d4c5ab] py-1 pl-1.5 pr-3 text-sm text-forest-900";

function Swatch({kind, hexes, size = 28}: {kind: string; hexes: string[]; size?: number}) {
  return (
    <span
      aria-hidden
      className="inline-block flex-none rounded-full"
      // A neutral grey hairline, so a black swatch still shows on a dark page and a white one on a light page.
      style={{width: size, height: size, background: addonSwatchBackground(kind, hexes), boxShadow: "0 0 0 1px rgba(150, 146, 136, 0.7)"}}
    />
  );
}

// One stop of a colour: pick a shade from the shared palette, or choose "Custom" and set
// any colour by hand.
function StopPicker({
  index,
  total,
  hex,
  palette,
  onChange
}: {
  index: number;
  total: number;
  hex: string;
  palette: PaletteColour[];
  onChange: (hex: string) => void;
}) {
  const match = palette.find((colour) => colour.hex.toLowerCase() === hex.toLowerCase());
  return (
    <div className="flex items-center gap-2">
      <Swatch kind="solid" hexes={[hex]} size={34} />
      <div className="min-w-0 flex-1">
        <span className={labelClass}>{total === 1 ? "Colour" : `Colour ${index + 1}`}</span>
        <div className="mt-1 flex gap-2">
          <select
            className={fieldClass}
            value={match?.id ?? "custom"}
            aria-label={`Colour ${index + 1} from the palette`}
            onChange={(event) => {
              const picked = palette.find((colour) => colour.id === event.target.value);
              if (picked) onChange(picked.hex);
            }}
          >
            {palette.map((colour) => (
              <option key={colour.id} value={colour.id}>
                {colour.name}
              </option>
            ))}
            {match ? null : <option value="custom">Custom colour</option>}
          </select>
          <input
            type="color"
            aria-label={`Pick colour ${index + 1} by hand`}
            className="h-10 w-12 flex-none cursor-pointer rounded-lg border border-[#d4c5ab] bg-[#fffdf9] p-1"
            value={hex}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// Builds one colour: one palette colour, or two or three side by side, with a live preview.
function ColourBuilder({
  groupId,
  editing,
  palette,
  onSave,
  onCancel
}: {
  groupId: string;
  editing: AddonColourView | null;
  palette: PaletteColour[];
  onSave: Send;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [kind, setKind] = useState<AddonColourKind>(editing?.kind ?? "solid");
  const [hexes, setHexes] = useState<string[]>(editing?.hexes ?? [palette[0]?.hex ?? "#7a4e2d"]);
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? true);

  const count = kind === "solid" ? 1 : kind === "two_tone" ? 2 : 3;
  const fallback = [palette[0]?.hex ?? "#7a4e2d", palette[1]?.hex ?? "#2a2523", palette[2]?.hex ?? "#f4efe6"];
  const stops = Array.from({length: count}, (_, index) => hexes[index] ?? fallback[index]);
  const nameFor = (hex: string) => palette.find((colour) => colour.hex.toLowerCase() === hex.toLowerCase())?.name ?? "Custom";
  const suggested = stops.map(nameFor).join(" & ");

  return (
    <div className="mt-3 rounded-xl border border-[#d4c5ab] p-4">
      <div className="flex flex-wrap items-start gap-4">
        <Swatch kind={kind} hexes={stops} size={64} />
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Name</span>
            <input className={`${fieldClass} mt-1`} value={label} onChange={(event) => setLabel(event.target.value)} placeholder={suggested} />
          </label>
          <label className="block">
            <span className={labelClass}>Made of</span>
            <select
              className={`${fieldClass} mt-1`}
              value={kind}
              onChange={(event) => {
                const next = event.target.value as AddonColourKind;
                setKind(next);
                setHexes(Array.from({length: next === "solid" ? 1 : next === "two_tone" ? 2 : 3}, (_, index) => hexes[index] ?? fallback[index]));
              }}
            >
              {Object.entries(KIND_LABELS).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stops.map((hex, index) => (
          <StopPicker
            key={index}
            index={index}
            total={count}
            hex={hex}
            palette={palette}
            onChange={(next) => setHexes(stops.map((current, at) => (at === index ? next : current)))}
          />
        ))}
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-forest-800">
        <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
        Show it straight away (otherwise it sits under "Other colours")
      </label>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            onSave({op: "colour.save", id: editing?.id, groupId, label: label.trim() || suggested, kind, hexes: stops, isDefault, active: editing?.active ?? true})
          }
        >
          {editing ? "Save colour" : "Add colour"}
        </button>
        <button type="button" className={btn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// Crops a photo to a square. Drag to move, slide to zoom; the finished picture is made in
// the browser and replaces the photo.
function CropDialog({image, onClose, onSaved}: {image: LibraryImage; onClose: () => void; onSaved: () => void}) {
  const VIEW = 320;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{px: number; py: number; ox: number; oy: number} | null>(null);
  const [nat, setNat] = useState<{w: number; h: number} | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({x: 0, y: 0});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const base = nat ? Math.max(VIEW / nat.w, VIEW / nat.h) : 1;
  const scale = base * zoom;
  const keep = (x: number, y: number, s: number) => (nat ? {x: Math.min(0, Math.max(VIEW - nat.w * s, x)), y: Math.min(0, Math.max(VIEW - nat.h * s, y))} : {x, y});

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function loaded(event: React.SyntheticEvent<HTMLImageElement>) {
    const el = event.currentTarget;
    const s = Math.max(VIEW / el.naturalWidth, VIEW / el.naturalHeight);
    setNat({w: el.naturalWidth, h: el.naturalHeight});
    setPos({x: (VIEW - el.naturalWidth * s) / 2, y: (VIEW - el.naturalHeight * s) / 2});
  }

  function changeZoom(next: number) {
    if (!nat) return;
    // Zoom around the middle of the frame.
    const cx = (VIEW / 2 - pos.x) / scale;
    const cy = (VIEW / 2 - pos.y) / scale;
    const s = base * next;
    setZoom(next);
    setPos(keep(VIEW / 2 - cx * s, VIEW / 2 - cy * s, s));
  }

  async function save() {
    const img = imgRef.current;
    if (!img || !nat) return;
    setBusy(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1000;
      canvas.height = 1000;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser cannot crop pictures.");
      context.drawImage(img, -pos.x / scale, -pos.y / scale, VIEW / scale, VIEW / scale, 0, 0, 1000, 1000);
      const blob = await new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob(resolve, "image/jpeg", 0.9);
        } catch {
          resolve(null);
        }
      });
      if (!blob) throw new Error("This photo could not be read for cropping. Download it and upload it again, then crop.");
      const form = new FormData();
      form.append("id", image.id);
      form.append("file", new File([blob], "cropped.jpg", {type: "image/jpeg"}));
      const response = await fetch("/api/admin/addons/crop", {method: "POST", body: form});
      const body = (await response.json().catch(() => ({}))) as {error?: string};
      if (!response.ok) throw new Error(body.error ?? "Could not save the cropped photo.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the cropped photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Crop photo" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="card w-full max-w-md space-y-4 p-5" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={titleClass}>Crop photo</h3>
            <p className={helpClass}>Drag the picture to move it, and use the slider to zoom. The square is what customers see.</p>
          </div>
          <button type="button" className={btn} aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-lg bg-black/30 ring-1 ring-black/30"
          style={{width: VIEW, height: VIEW, cursor: "grab"}}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {px: event.clientX, py: event.clientY, ox: pos.x, oy: pos.y};
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            setPos(keep(drag.current.ox + event.clientX - drag.current.px, drag.current.oy + event.clientY - drag.current.py, scale));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={image.url}
            alt=""
            crossOrigin="anonymous"
            draggable={false}
            onLoad={loaded}
            onError={() => setError("This photo could not be opened.")}
            className="absolute left-0 top-0 max-w-none"
            style={nat ? {width: nat.w * scale, height: nat.h * scale, transform: `translate(${pos.x}px, ${pos.y}px)`} : {opacity: 0}}
          />
        </div>
        <label className="flex items-center gap-3 text-sm text-forest-800">
          Zoom
          <input type="range" min={1} max={4} step={0.05} value={zoom} className="flex-1" onChange={(event) => changeZoom(Number(event.target.value))} />
        </label>
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button type="button" className={btnPrimary} disabled={busy || !nat} onClick={() => void save()}>
            {busy ? "Saving..." : "Save crop"}
          </button>
          <button type="button" className={btn} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoList({
  images,
  data,
  send,
  busy,
  onCrop
}: {
  images: LibraryImage[];
  data: AdminData;
  send: Send;
  busy: boolean;
  onCrop: (image: LibraryImage) => void;
}) {
  if (!images.length) return <p className={`${helpClass} mt-2`}>Nothing here.</p>;
  return (
    <ul className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => {
        const species = data.species.find((entry) => entry.id === image.speciesId) ?? null;
        const assign = (patch: Partial<LibraryImage>) => {
          const next = {...image, ...patch};
          return send({op: "image.assign", id: image.id, speciesId: next.speciesId, poseId: next.poseId, colourId: next.colourId, zoom: next.zoom, isPrimary: next.isPrimary});
        };
        return (
          <li key={image.id} className="rounded-xl border border-[#d4c5ab] p-3">
            <div className="aspect-square overflow-hidden rounded-lg bg-black/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.caption ?? "Add-on photo"} className="h-full w-full object-cover" style={{transform: `scale(${image.zoom})`}} />
            </div>
            <p className="mt-2 truncate text-xs text-forest-600">{image.caption}</p>
            <select
              className={`${fieldClass} mt-2`}
              value={image.speciesId ?? ""}
              disabled={busy}
              aria-label="Animal this photo shows"
              onChange={(event) => void assign({speciesId: event.target.value || null, poseId: null, colourId: null})}
            >
              <option value="">Not given to an animal yet</option>
              {data.species.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            {species ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select className={fieldClass} value={image.poseId ?? ""} aria-label="Pose this photo shows" disabled={busy || !species.poses.length} onChange={(event) => void assign({poseId: event.target.value || null})}>
                  <option value="">Any {species.poseLabel?.toLowerCase() ?? "pose"}</option>
                  {species.poses.map((pose) => (
                    <option key={pose.id} value={pose.id}>
                      {pose.label}
                    </option>
                  ))}
                </select>
                <select className={fieldClass} value={image.colourId ?? ""} aria-label="Colour this photo shows" disabled={busy} onChange={(event) => void assign({colourId: event.target.value || null})}>
                  <option value="">Any colour</option>
                  {species.colours.map((colour) => (
                    <option key={colour.id} value={colour.id}>
                      {colour.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-forest-700">
              <button type="button" className={btn} disabled={busy} onClick={() => onCrop(image)}>
                <Crop className="h-4 w-4" aria-hidden /> Crop
              </button>
              {species ? (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={image.isPrimary} disabled={busy} onChange={(event) => void assign({isPrimary: event.target.checked})} />
                  Main photo
                </label>
              ) : null}
              <button
                type="button"
                className="text-red-600 underline"
                disabled={busy}
                onClick={() => window.confirm("Remove this photo from the library?") && void send({op: "image.delete", id: image.id})}
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PoseEditor({species, busy, send}: {species: AddonSpeciesView; busy: boolean; send: Send}) {
  const [label, setLabel] = useState("");
  return (
    <div>
      <p className={helpClass}>
        Poses or views (Front and Side, Standing and Sitting, or breeds for Other dogs). An animal with at least one shows a choice; this is separate from colour.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {species.poses.length === 0 ? <li className={helpClass}>None yet.</li> : null}
        {species.poses.map((pose) => (
          <li key={pose.id} className={`${chip} pl-3`}>
            {pose.label}
            <button type="button" className="text-red-600" aria-label={`Remove ${pose.label}`} disabled={busy} onClick={() => void send({op: "pose.delete", id: pose.id})}>
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (label.trim()) void send({op: "pose.save", speciesId: species.id, label}).then(() => setLabel(""));
        }}
      >
        <label className="block">
          <span className={labelClass}>New choice</span>
          <input className={`${fieldClass} mt-1 w-52`} placeholder="e.g. Standing" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <button type="submit" className={btn} disabled={busy}>
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
        <label className="block">
          <span className={labelClass}>What customers see it called</span>
          <input
            className={`${fieldClass} mt-1 w-44`}
            defaultValue={species.poseLabel ?? ""}
            placeholder="Pose, View, Breed"
            onBlur={(event) => event.target.value !== (species.poseLabel ?? "") && void send({op: "species.update", id: species.id, poseLabel: event.target.value.trim() || null})}
          />
        </label>
      </form>
    </div>
  );
}

function ColourTab({
  species,
  palette,
  busy,
  send,
  builder,
  setBuilder
}: {
  species: AddonSpeciesView;
  palette: PaletteColour[];
  busy: boolean;
  send: Send;
  builder: {groupId: string; editing: AddonColourView | null} | null;
  setBuilder: (next: {groupId: string; editing: AddonColourView | null} | null) => void;
}) {
  const shown = species.colours.filter((colour) => colour.isDefault);
  const other = species.colours.filter((colour) => !colour.isDefault);
  const save = (colour: AddonColourView, patch: Partial<AddonColourView>) => {
    const next = {...colour, ...patch};
    return send({op: "colour.save", id: colour.id, groupId: species.colourGroupId, label: next.label, kind: next.kind, hexes: next.hexes, isDefault: next.isDefault, active: next.active});
  };
  const row = (colour: AddonColourView) => (
    <li key={colour.id} className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${colour.active ? "border-[#d4c5ab]" : "border-dashed border-[#d4c5ab] opacity-60"}`}>
      <Swatch kind={colour.kind} hexes={colour.hexes} size={32} />
      <span className="min-w-0 flex-1 text-sm font-medium text-forest-900">{colour.label}</span>
      <button type="button" className="text-xs underline text-forest-700" disabled={busy} onClick={() => void save(colour, {isDefault: !colour.isDefault})}>
        {colour.isDefault ? "Move to Other colours" : "Show straight away"}
      </button>
      <button type="button" className="text-xs underline text-forest-700" disabled={busy} onClick={() => void save(colour, {active: !colour.active})}>
        {colour.active ? "Hide" : "Show"}
      </button>
      <button type="button" className="text-xs underline text-forest-700" onClick={() => setBuilder({groupId: species.colourGroupId, editing: colour})}>
        Edit
      </button>
      <button type="button" className="text-xs underline text-red-600" disabled={busy} onClick={() => window.confirm(`Remove ${colour.label}?`) && void send({op: "colour.delete", id: colour.id})}>
        Remove
      </button>
    </li>
  );
  return (
    <div className="space-y-4">
      <div>
        <p className={labelClass}>Shown straight away</p>
        <ul className="mt-2 grid gap-2 lg:grid-cols-2">{shown.length ? shown.map(row) : <li className={helpClass}>None. All colours show together.</li>}</ul>
      </div>
      <div>
        <p className={labelClass}>Under "Other colours"</p>
        <ul className="mt-2 grid gap-2 lg:grid-cols-2">{other.length ? other.map(row) : <li className={helpClass}>None.</li>}</ul>
      </div>

      {palette.length ? (
        <div>
          <p className={labelClass}>Add a palette colour in one click</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {palette.map((colour) => (
              <button
                key={colour.id}
                type="button"
                className={`${chip} hover:border-forest-400`}
                disabled={busy || species.colours.some((existing) => existing.label === colour.name)}
                title={species.colours.some((existing) => existing.label === colour.name) ? "Already added" : `Add ${colour.name}`}
                onClick={() => void send({op: "colour.save", groupId: species.colourGroupId, label: colour.name, kind: "solid", hexes: [colour.hex], isDefault: false, active: true})}
              >
                <Swatch kind="solid" hexes={[colour.hex]} size={22} />
                {colour.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {builder && builder.groupId === species.colourGroupId ? (
        <ColourBuilder key={builder.editing?.id ?? "new"} groupId={builder.groupId} editing={builder.editing} palette={palette} onSave={send} onCancel={() => setBuilder(null)} />
      ) : (
        <button type="button" className={btn} onClick={() => setBuilder({groupId: species.colourGroupId, editing: null})}>
          <Plus className="h-4 w-4" aria-hidden /> New colour or combination
        </button>
      )}
    </div>
  );
}

function PaletteSection({palette, send, busy}: {palette: PaletteColour[]; send: Send; busy: boolean}) {
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#7a4e2d");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHex, setEditHex] = useState("#000000");

  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className={titleClass}>Colour palette</h2>
        <p className={helpClass}>
          The shared set of basic colours every animal is built from, so Brown or Grey looks the same everywhere. Changing a shade here is for colours you make next; it does not repaint ones already made.
        </p>
      </div>
      {palette.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d4c5ab] p-4">
          <p className={helpClass}>The palette is empty. Add the starting colours (Brown, Black, White, Grey, Chestnut, Dark Tan, Light Tan, Light Cream, Blue, Red and a few more), or add your own below.</p>
          <button type="button" className={`${btnPrimary} mt-3`} disabled={busy} onClick={() => void send({op: "library.seed"})}>
            Add the starting colours
          </button>
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {palette.map((colour) => (
            <li key={colour.id} className="rounded-xl border border-[#d4c5ab] px-3 py-2">
              {editId === colour.id ? (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void send({op: "library.save", id: colour.id, name: editName, hex: editHex}).then((ok) => ok && setEditId(null));
                  }}
                >
                  <input type="color" aria-label="Colour" className="h-9 w-11 rounded border border-[#d4c5ab] bg-[#fffdf9] p-1" value={editHex} onChange={(event) => setEditHex(event.target.value)} />
                  <input className={`${fieldClass} min-w-0 flex-1`} value={editName} onChange={(event) => setEditName(event.target.value)} aria-label="Colour name" />
                  <button type="submit" className={btnPrimary} disabled={busy}>
                    Save
                  </button>
                  <button type="button" className={btn} onClick={() => setEditId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <Swatch kind="solid" hexes={[colour.hex]} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-forest-900">{colour.name}</span>
                    <span className="block text-xs text-forest-600">{colour.hex}</span>
                  </span>
                  <button
                    type="button"
                    className="text-xs underline text-forest-700"
                    onClick={() => {
                      setEditId(colour.id);
                      setEditName(colour.name);
                      setEditHex(colour.hex);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="text-xs underline text-red-600" disabled={busy} onClick={() => window.confirm(`Remove ${colour.name} from the palette?`) && void send({op: "library.delete", id: colour.id})}>
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) void send({op: "library.save", name, hex}).then((ok) => ok && setName(""));
        }}
      >
        <label className="block">
          <span className={labelClass}>New colour</span>
          <div className="mt-1 flex gap-2">
            <input type="color" aria-label="Pick the colour" className="h-10 w-12 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] p-1" value={hex} onChange={(event) => setHex(event.target.value)} />
            <input className={`${fieldClass} w-56`} placeholder="Name, e.g. Honey" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
        </label>
        <button type="submit" className={btnPrimary} disabled={busy}>
          <Plus className="h-4 w-4" aria-hidden /> Add to palette
        </button>
      </form>
    </section>
  );
}

export function AddonsAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<"colours" | "poses" | "photos">("colours");
  const [builder, setBuilder] = useState<{groupId: string; editing: AddonColourView | null} | null>(null);
  const [newName, setNewName] = useState("");
  const [priceIdr, setPriceIdr] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [maxPerBag, setMaxPerBag] = useState("");
  const [saved, setSaved] = useState(false);
  const [cropping, setCropping] = useState<LibraryImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((next: AdminData) => {
    setData(next);
    setPriceIdr(String(next.settings.priceIdr));
    setPriceUsd((next.settings.priceUsdCents / 100).toFixed(2));
    setMaxPerBag(String(next.settings.maxPerBag));
  }, []);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/addons", {cache: "no-store"});
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Could not load add-ons.");
    apply(body);
  }, [apply]);

  useEffect(() => {
    reload().catch((cause: Error) => setError(cause.message));
  }, [reload]);

  const send: Send = useCallback(
    async (body) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/addons", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not save that change.");
        apply(result);
        setBuilder(null);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save that change.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apply]
  );

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch("/api/admin/addons/upload", {method: "POST", body: form});
      if (!response.ok) throw new Error((await response.json()).error ?? "Upload failed.");
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const groupMembers = useMemo(() => {
    const map = new Map<string, AddonSpeciesView[]>();
    data?.species.forEach((species) => map.set(species.colourGroupId, [...(map.get(species.colourGroupId) ?? []), species]));
    return map;
  }, [data]);

  if (!data) {
    return <p className={helpClass}>{error ?? "Loading add-ons..."}</p>;
  }

  const unassigned = data.library.filter((image) => !image.speciesId);

  return (
    <div className="space-y-8">
      {error ? (
        <p role="alert" className="rounded-lg border border-red-400/60 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      <section className="card space-y-4 p-5 sm:p-6">
        <div>
          <h2 className={titleClass}>Price and limit</h2>
          <p className={helpClass}>One flat price for every add-on, whatever the animal or colour, and the most a single bag can carry.</p>
        </div>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void send({op: "settings", priceIdr: Number(priceIdr), priceUsdCents: Math.round(Number(priceUsd) * 100), maxPerBag: Number(maxPerBag)}).then((ok) => {
              if (ok) {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 2500);
              }
            });
          }}
        >
          <label className="block">
            <span className={labelClass}>Price in rupiah</span>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-forest-600">Rp</span>
              <input className={`${fieldClass} pl-10`} inputMode="numeric" value={priceIdr} onChange={(event) => setPriceIdr(event.target.value)} />
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>Price in US dollars</span>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-forest-600">$</span>
              <input className={`${fieldClass} pl-8`} inputMode="decimal" value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} />
            </div>
          </label>
          <label className="block">
            <span className={labelClass}>Most add-ons per bag</span>
            <input className={`${fieldClass} mt-1`} inputMode="numeric" value={maxPerBag} onChange={(event) => setMaxPerBag(event.target.value)} />
          </label>
          <div className="flex items-center gap-3">
            <button type="submit" className={btnPrimary} disabled={busy}>
              Save
            </button>
            {saved ? (
              <span className="flex items-center gap-1 text-sm font-medium text-forest-700">
                <Check className="h-4 w-4" aria-hidden /> Saved
              </span>
            ) : null}
          </div>
        </form>
        <p className={helpClass}>Which animals a bag offers is set on each product, under Custom Options &amp; Extras.</p>
      </section>

      <section className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={titleClass}>Animals</h2>
            <p className={helpClass}>Use the arrows to set the order customers see. The eye shows or hides an animal on the shop; hidden ones are kept for later.</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (newName.trim()) void send({op: "species.create", name: newName}).then(() => setNewName(""));
            }}
          >
            <input className={`${fieldClass} w-56`} placeholder="New animal name" aria-label="New animal name" value={newName} onChange={(event) => setNewName(event.target.value)} />
            <button type="submit" className={btnPrimary} disabled={busy}>
              <Plus className="h-4 w-4" aria-hidden /> Add
            </button>
          </form>
        </div>

        <ul className="space-y-3">
          {data.species.map((species, index) => {
            const open = openId === species.id;
            const sharing = (groupMembers.get(species.colourGroupId) ?? []).filter((other) => other.id !== species.id);
            const photos = data.library.filter((image) => image.speciesId === species.id);
            const cover = photos.find((image) => image.isPrimary) ?? photos[0];
            return (
              <li key={species.id} className={`rounded-xl border ${species.active ? "border-[#d4c5ab]" : "border-dashed border-[#d4c5ab] opacity-75"}`}>
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <div className="flex flex-col">
                    <button type="button" className="rounded p-0.5 text-forest-700 disabled:opacity-30" aria-label={`Move ${species.name} up`} disabled={busy || index === 0} onClick={() => void send({op: "species.move", id: species.id, direction: "up"})}>
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button type="button" className="rounded p-0.5 text-forest-700 disabled:opacity-30" aria-label={`Move ${species.name} down`} disabled={busy || index === data.species.length - 1} onClick={() => void send({op: "species.move", id: species.id, direction: "down"})}>
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open} onClick={() => setOpenId(open ? null : species.id)}>
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover.url} alt="" className="h-14 w-14 flex-none rounded-lg object-cover" style={{objectPosition: "center"}} />
                    ) : (
                      <span className="flex h-14 w-14 flex-none items-center justify-center rounded-lg bg-black/10 text-[10px] text-forest-600">No photo</span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-forest-900">{species.name}</span>
                      <span className="block text-xs text-forest-600">
                        {species.colours.length} colours{species.poses.length ? `, ${species.poses.length} ${species.poseLabel?.toLowerCase() ?? "poses"}` : ""}, {photos.length} {photos.length === 1 ? "photo" : "photos"}
                      </span>
                    </span>
                  </button>
                  <span className="hidden gap-1 sm:flex">
                    {species.colours.slice(0, 6).map((colour) => (
                      <Swatch key={colour.id} kind={colour.kind} hexes={colour.hexes} size={22} />
                    ))}
                  </span>
                  <button type="button" className={btn} disabled={busy} aria-pressed={species.active} onClick={() => void send({op: "species.update", id: species.id, active: !species.active})}>
                    {species.active ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                    {species.active ? "Shown" : "Hidden"}
                  </button>
                </div>

                {open ? (
                  <div className="space-y-5 border-t border-[#d4c5ab] p-4">
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="block">
                        <span className={labelClass}>Name</span>
                        <input
                          className={`${fieldClass} mt-1 w-64`}
                          defaultValue={species.name}
                          onBlur={(event) => event.target.value.trim() && event.target.value !== species.name && void send({op: "species.update", id: species.id, name: event.target.value})}
                        />
                      </label>
                      <button
                        type="button"
                        className={`${btn} text-red-600`}
                        disabled={busy}
                        onClick={() => window.confirm(`Delete ${species.name}? Orders already placed keep their record. Hide it instead to keep it for later.`) && void send({op: "species.delete", id: species.id})}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden /> Delete
                      </button>
                    </div>

                    <div role="tablist" aria-label={`${species.name} settings`} className="flex gap-1 border-b border-[#d4c5ab]">
                      {(["colours", "poses", "photos"] as const).map((name) => (
                        <button
                          key={name}
                          type="button"
                          role="tab"
                          aria-selected={tab === name}
                          onClick={() => setTab(name)}
                          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${tab === name ? "border-forest-700 text-forest-900" : "border-transparent text-forest-600 hover:text-forest-900"}`}
                        >
                          {name === "poses" ? species.poseLabel?.toLowerCase() ?? "poses" : name}
                        </button>
                      ))}
                    </div>

                    {tab === "colours" ? (
                      <>
                        {sharing.length ? (
                          <p className={helpClass}>
                            Shares this colour list with {sharing.map((other) => other.name).join(", ")}.{" "}
                            <button type="button" className="underline" onClick={() => void send({op: "species.update", id: species.id, detachColours: true})}>
                              Give {species.name} its own copy
                            </button>
                          </p>
                        ) : null}
                        <ColourTab species={species} palette={data.palette} busy={busy} send={send} builder={builder} setBuilder={setBuilder} />
                      </>
                    ) : null}
                    {tab === "poses" ? <PoseEditor species={species} busy={busy} send={send} /> : null}
                    {tab === "photos" ? <PhotoList images={photos} data={data} send={send} busy={busy} onCrop={setCropping} /> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <PaletteSection palette={data.palette} send={send} busy={busy} />

      <section className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className={titleClass}>Photo library</h2>
            <p className={helpClass}>
              {unassigned.length === 0 ? "Every photo has an animal." : `${unassigned.length} photos are waiting for an animal.`} Choose the animal for each one, and crop it to a square if you like. Nothing is matched automatically.
            </p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void upload(event.target.files)} />
            <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" aria-hidden /> Upload photos
            </button>
          </div>
        </div>
        <PhotoList images={unassigned} data={data} send={send} busy={busy} onCrop={setCropping} />
      </section>

      {cropping ? (
        <CropDialog
          image={cropping}
          onClose={() => setCropping(null)}
          onSaved={() => {
            setCropping(null);
            void reload();
          }}
        />
      ) : null}
    </div>
  );
}
