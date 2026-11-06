"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Check, Eye, EyeOff, Plus, Trash2, Upload} from "lucide-react";
import {addonSwatchBackground, type AddonColourKind, type AddonColourView, type AddonSpeciesView} from "@/lib/addon-shared";

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

type AdminData = {
  settings: {priceIdr: number; priceUsdCents: number; maxPerBag: number};
  species: AddonSpeciesView[];
  groups: {id: string; name: string}[];
  library: LibraryImage[];
};

const KIND_LABELS: Record<AddonColourKind, string> = {solid: "One colour", two_tone: "Two colours", three_tone: "Three colours"};
const field = "w-full rounded-lg border border-[#d9cfc0] bg-white px-3 py-2 text-sm text-forest-900";
const button = "rounded-lg border border-[#d9cfc0] bg-white px-3 py-2 text-sm font-medium text-forest-900 hover:bg-[#f6f0e3]";
const primary = "rounded-lg bg-forest-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90";

function Swatch({kind, hexes, size = 28}: {kind: string; hexes: string[]; size?: number}) {
  return (
    <span
      aria-hidden
      className="inline-block flex-none rounded-full ring-1 ring-black/25"
      style={{width: size, height: size, background: addonSwatchBackground(kind, hexes)}}
    />
  );
}

// Builds one colour: a single flat colour, or two or three colours shown as
// clear side-by-side blocks (no blends), with a live preview. Used for both new
// and existing colours.
function ColourBuilder({
  groupId,
  editing,
  onSave,
  onCancel
}: {
  groupId: string;
  editing: AddonColourView | null;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(editing?.label ?? "");
  const [kind, setKind] = useState<AddonColourKind>(editing?.kind ?? "solid");
  const [hexes, setHexes] = useState<string[]>(editing?.hexes ?? ["#b58a5a"]);
  const [isDefault, setIsDefault] = useState(editing?.isDefault ?? false);

  const count = kind === "solid" ? 1 : kind === "two_tone" ? 2 : 3;
  const stops = Array.from({length: count}, (_, index) => hexes[index] ?? hexes[hexes.length - 1] ?? "#b58a5a");

  return (
    <div className="mt-3 rounded-lg border border-[#d9cfc0] bg-[#fbf7ec] p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[10rem] flex-1 text-xs text-forest-700">
          Colour name
          <input className={`${field} mt-1`} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. White & Black" />
        </label>
        <label className="text-xs text-forest-700">
          Style
          <select
            className={`${field} mt-1`}
            value={kind}
            onChange={(event) => {
              const next = event.target.value as AddonColourKind;
              setKind(next);
              setHexes((current) => (next === "solid" ? current.slice(0, 1) : next === "two_tone" ? [current[0], current[1] ?? "#2a2523"] : [current[0], current[1] ?? "#c28a52", current[2] ?? "#f4efe6"]));
            }}
          >
            {Object.entries(KIND_LABELS).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          {stops.map((hex, index) => (
            <label key={index} className="text-xs text-forest-700">
              {kind === "solid" ? "Colour" : `Colour ${index + 1}`}
              <input
                type="color"
                className="mt-1 block h-10 w-14 rounded border border-[#d9cfc0] bg-white"
                value={hex}
                onChange={(event) => setHexes(stops.map((current, at) => (at === index ? event.target.value : current)))}
              />
            </label>
          ))}
        </div>
        <Swatch kind={kind} hexes={stops} size={44} />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-forest-800">
        <input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} />
        Show pre-selected to customers
      </label>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className={primary}
          onClick={() =>
            onSave({op: "colour.save", id: editing?.id, groupId, label, kind, hexes: stops, isDefault, active: editing?.active ?? true})
          }
        >
          {editing ? "Save colour" : "Add colour"}
        </button>
        <button type="button" className={button} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AddonsAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [builder, setBuilder] = useState<{groupId: string; editing: AddonColourView | null} | null>(null);
  const [newName, setNewName] = useState("");
  const [priceIdr, setPriceIdr] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [maxPerBag, setMaxPerBag] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((next: AdminData) => {
    setData(next);
    setPriceIdr(String(next.settings.priceIdr));
    setPriceUsd((next.settings.priceUsdCents / 100).toFixed(2));
    setMaxPerBag(String(next.settings.maxPerBag));
  }, []);

  useEffect(() => {
    fetch("/api/admin/addons", {cache: "no-store"})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load add-ons.");
        apply(body);
      })
      .catch((cause: Error) => setError(cause.message));
  }, [apply]);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/addons", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save that change.");
      apply(result);
      setBuilder(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save that change.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach((file) => form.append("files", file));
      const response = await fetch("/api/admin/addons/upload", {method: "POST", body: form});
      if (!response.ok) throw new Error((await response.json()).error ?? "Upload failed.");
      const reload = await fetch("/api/admin/addons", {cache: "no-store"});
      apply(await reload.json());
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
    return <p className="text-sm text-forest-700">{error ?? "Loading add-ons..."}</p>;
  }

  const unassigned = data.library.filter((image) => !image.speciesId);

  return (
    <div className="space-y-8">
      {error ? (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-[#d9cfc0] bg-[#fbf7ec] p-4">
        <h2 className="font-display text-xl text-forest-900">Price and limit</h2>
        <p className="mt-1 text-sm text-forest-700">One flat price for every add-on, whatever the animal or colour.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-xs text-forest-700">
            Price in rupiah
            <input className={`${field} mt-1 w-40`} inputMode="numeric" value={priceIdr} onChange={(event) => setPriceIdr(event.target.value)} />
          </label>
          <label className="text-xs text-forest-700">
            Price in US dollars
            <input className={`${field} mt-1 w-32`} inputMode="decimal" value={priceUsd} onChange={(event) => setPriceUsd(event.target.value)} />
          </label>
          <label className="text-xs text-forest-700">
            Most add-ons per bag
            <input className={`${field} mt-1 w-28`} inputMode="numeric" value={maxPerBag} onChange={(event) => setMaxPerBag(event.target.value)} />
          </label>
          <button
            type="button"
            className={primary}
            disabled={busy}
            onClick={() =>
              send({op: "settings", priceIdr: Number(priceIdr), priceUsdCents: Math.round(Number(priceUsd) * 100), maxPerBag: Number(maxPerBag)})
            }
          >
            Save
          </button>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl text-forest-900">Animals</h2>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (newName.trim()) send({op: "species.create", name: newName}).then(() => setNewName(""));
            }}
          >
            <input className={`${field} w-56`} placeholder="New animal name" value={newName} onChange={(event) => setNewName(event.target.value)} />
            <button type="submit" className={primary} disabled={busy}>
              <Plus className="inline h-4 w-4" aria-hidden /> Add
            </button>
          </form>
        </div>
        <p className="mt-1 text-sm text-forest-700">
          The eye button decides whether an animal shows on the shop. Hidden animals are kept and can be shown again any time.
        </p>

        <ul className="mt-4 space-y-3">
          {data.species.map((species) => {
            const open = openId === species.id;
            const sharing = (groupMembers.get(species.colourGroupId) ?? []).filter((other) => other.id !== species.id);
            const photos = data.library.filter((image) => image.speciesId === species.id);
            return (
              <li key={species.id} className={`rounded-xl border bg-white ${species.active ? "border-[#d9cfc0]" : "border-dashed border-[#d9cfc0] opacity-75"}`}>
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <button type="button" className="flex flex-1 items-center gap-3 text-left" onClick={() => setOpenId(open ? null : species.id)} aria-expanded={open}>
                    {photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photos[0].url} alt="" className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded bg-[#efe5d0] text-xs text-forest-600">No photo</span>
                    )}
                    <span>
                      <span className="block font-medium text-forest-900">{species.name}</span>
                      <span className="block text-xs text-forest-600">
                        {species.colours.length} colours{species.poses.length ? `, ${species.poses.length} poses` : ""}, {photos.length} photos
                      </span>
                    </span>
                  </button>
                  <span className="flex gap-1">
                    {species.colours.slice(0, 6).map((colour) => (
                      <Swatch key={colour.id} kind={colour.kind} hexes={colour.hexes} size={20} />
                    ))}
                  </span>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    aria-pressed={species.active}
                    onClick={() => send({op: "species.update", id: species.id, active: !species.active})}
                  >
                    {species.active ? <Eye className="inline h-4 w-4" aria-hidden /> : <EyeOff className="inline h-4 w-4" aria-hidden />}{" "}
                    {species.active ? "Shown" : "Hidden"}
                  </button>
                </div>

                {open ? (
                  <div className="space-y-5 border-t border-[#d9cfc0] p-3">
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="text-xs text-forest-700">
                        Name
                        <input
                          className={`${field} mt-1 w-56`}
                          defaultValue={species.name}
                          onBlur={(event) => event.target.value.trim() && event.target.value !== species.name && send({op: "species.update", id: species.id, name: event.target.value})}
                        />
                      </label>
                      <button
                        type="button"
                        className={`${button} text-red-700`}
                        disabled={busy}
                        onClick={() => window.confirm(`Delete ${species.name}? Old orders keep their record. Hide it instead to keep it for later.`) && send({op: "species.delete", id: species.id})}
                      >
                        <Trash2 className="inline h-4 w-4" aria-hidden /> Delete
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-forest-900">Colours</h3>
                      {sharing.length ? (
                        <p className="mt-1 text-xs text-forest-700">
                          Shares this list with {sharing.map((other) => other.name).join(", ")}.{" "}
                          <button type="button" className="underline" onClick={() => send({op: "species.update", id: species.id, detachColours: true})}>
                            Give {species.name} its own copy
                          </button>
                        </p>
                      ) : null}
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {species.colours.length === 0 ? <li className="text-sm text-forest-600">No colours yet.</li> : null}
                        {species.colours.map((colour) => (
                          <li key={colour.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${colour.active ? "border-[#d9cfc0]" : "border-dashed opacity-60"}`}>
                            <Swatch kind={colour.kind} hexes={colour.hexes} />
                            <span>{colour.label}</span>
                            <button
                              type="button"
                              title={colour.isDefault ? "Pre-selected for customers" : "Not pre-selected"}
                              aria-pressed={colour.isDefault}
                              className={`rounded px-1.5 text-xs ${colour.isDefault ? "bg-forest-900 text-white" : "border border-[#d9cfc0]"}`}
                              onClick={() => send({op: "colour.save", id: colour.id, groupId: species.colourGroupId, label: colour.label, kind: colour.kind, hexes: colour.hexes, isDefault: !colour.isDefault, active: colour.active})}
                            >
                              {colour.isDefault ? <Check className="inline h-3 w-3" aria-hidden /> : null} default
                            </button>
                            <button
                              type="button"
                              className="text-xs underline"
                              onClick={() => send({op: "colour.save", id: colour.id, groupId: species.colourGroupId, label: colour.label, kind: colour.kind, hexes: colour.hexes, isDefault: colour.isDefault, active: !colour.active})}
                            >
                              {colour.active ? "hide" : "show"}
                            </button>
                            <button type="button" className="text-xs underline" onClick={() => setBuilder({groupId: species.colourGroupId, editing: colour})}>
                              edit
                            </button>
                            <button type="button" className="text-xs text-red-700 underline" onClick={() => window.confirm(`Remove ${colour.label}?`) && send({op: "colour.delete", id: colour.id})}>
                              remove
                            </button>
                          </li>
                        ))}
                      </ul>
                      {builder && builder.groupId === species.colourGroupId ? (
                        <ColourBuilder key={builder.editing?.id ?? "new"} groupId={builder.groupId} editing={builder.editing} onSave={send} onCancel={() => setBuilder(null)} />
                      ) : (
                        <button type="button" className={`${button} mt-3`} onClick={() => setBuilder({groupId: species.colourGroupId, editing: null})}>
                          <Plus className="inline h-4 w-4" aria-hidden /> New colour or combination
                        </button>
                      )}
                    </div>

                    <PoseEditor species={species} busy={busy} send={send} />

                    <div>
                      <h3 className="text-sm font-semibold text-forest-900">Photos for {species.name}</h3>
                      <PhotoList images={photos} data={data} send={send} busy={busy} />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-forest-900">Photo library</h2>
            <p className="mt-1 text-sm text-forest-700">
              {unassigned.length} photos are waiting to be given to an animal. Choose the animal for each one; nothing is matched automatically.
            </p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => upload(event.target.files)} />
            <button type="button" className={button} disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="inline h-4 w-4" aria-hidden /> Upload photos
            </button>
          </div>
        </div>
        <PhotoList images={unassigned} data={data} send={send} busy={busy} />
      </section>
    </div>
  );
}

function PoseEditor({species, busy, send}: {species: AddonSpeciesView; busy: boolean; send: (body: Record<string, unknown>) => Promise<void>}) {
  const [label, setLabel] = useState("");
  return (
    <div>
      <h3 className="text-sm font-semibold text-forest-900">Poses or views (optional)</h3>
      <p className="mt-1 text-xs text-forest-700">Only animals with at least one pose show a pose choice. This is separate from colour.</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {species.poses.map((pose) => (
          <li key={pose.id} className="flex items-center gap-2 rounded-lg border border-[#d9cfc0] px-2 py-1.5 text-sm">
            {pose.label}
            <button type="button" className="text-xs text-red-700 underline" disabled={busy} onClick={() => send({op: "pose.delete", id: pose.id})}>
              remove
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (label.trim()) send({op: "pose.save", speciesId: species.id, label}).then(() => setLabel(""));
        }}
      >
        <input className={`${field} w-48`} placeholder="e.g. Standing" value={label} onChange={(event) => setLabel(event.target.value)} />
        <button type="submit" className={button} disabled={busy}>
          Add pose
        </button>
        <input
          className={`${field} w-40`}
          defaultValue={species.poseLabel ?? ""}
          placeholder="Selector name"
          aria-label="Name of the pose selector"
          onBlur={(event) => event.target.value !== (species.poseLabel ?? "") && send({op: "species.update", id: species.id, poseLabel: event.target.value.trim() || null})}
        />
      </form>
    </div>
  );
}

function PhotoList({images, data, send, busy}: {images: LibraryImage[]; data: AdminData; send: (body: Record<string, unknown>) => Promise<void>; busy: boolean}) {
  if (!images.length) return <p className="mt-2 text-sm text-forest-600">Nothing here.</p>;
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {images.map((image) => {
        const species = data.species.find((entry) => entry.id === image.speciesId) ?? null;
        const assign = (patch: Partial<LibraryImage>) => {
          const next = {...image, ...patch};
          return send({op: "image.assign", id: image.id, speciesId: next.speciesId, poseId: next.poseId, colourId: next.colourId, zoom: next.zoom, isPrimary: next.isPrimary});
        };
        return (
          <li key={image.id} className="rounded-lg border border-[#d9cfc0] bg-white p-2">
            <div className="aspect-[4/3] overflow-hidden rounded bg-[#efe5d0]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.caption ?? "Add-on photo"} className="h-full w-full object-cover" style={{transform: `scale(${image.zoom})`}} />
            </div>
            <p className="mt-1 truncate text-xs text-forest-600">{image.caption}</p>
            <select
              className={`${field} mt-1`}
              value={image.speciesId ?? ""}
              disabled={busy}
              aria-label="Animal this photo shows"
              onChange={(event) => assign({speciesId: event.target.value || null, poseId: null, colourId: null})}
            >
              <option value="">Not assigned</option>
              {data.species.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            {species ? (
              <div className="mt-1 grid grid-cols-2 gap-1">
                <select className={field} value={image.poseId ?? ""} aria-label="Pose this photo shows" disabled={busy || !species.poses.length} onChange={(event) => assign({poseId: event.target.value || null})}>
                  <option value="">Any pose</option>
                  {species.poses.map((pose) => (
                    <option key={pose.id} value={pose.id}>
                      {pose.label}
                    </option>
                  ))}
                </select>
                <select className={field} value={image.colourId ?? ""} aria-label="Colour this photo shows" disabled={busy} onChange={(event) => assign({colourId: event.target.value || null})}>
                  <option value="">Any colour</option>
                  {species.colours.map((colour) => (
                    <option key={colour.id} value={colour.id}>
                      {colour.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-forest-700">
              <label className="flex items-center gap-1">
                Zoom
                <input type="range" min={1} max={2} step={0.1} value={image.zoom} disabled={busy} onChange={(event) => assign({zoom: Number(event.target.value)})} />
              </label>
              {species ? (
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={image.isPrimary} disabled={busy} onChange={(event) => assign({isPrimary: event.target.checked})} />
                  Main
                </label>
              ) : null}
              <button type="button" className="text-red-700 underline" disabled={busy} onClick={() => window.confirm("Remove this photo from the library?") && send({op: "image.delete", id: image.id})}>
                remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
