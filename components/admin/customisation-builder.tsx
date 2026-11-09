"use client";

import {useEffect, useState} from "react";
import {ArrowDown, ArrowUp, Check, Plus, Trash2} from "lucide-react";
import {COLOUR_LIBRARY} from "@/lib/colour-library";
import type {OptionField, ProductOptions, SubField} from "@/lib/product-options";
import {ColourOptionsEditor} from "./colour-options-editor";
import {GlassToggle} from "./glass-toggle";

const inputClass =
  "min-w-0 rounded-lg border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400";
const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-forest-500";

function newId() {
  return `f_${Math.random().toString(36).slice(2, 8)}`;
}

function colours(count = 8) {
  return COLOUR_LIBRARY.slice(0, count).map((colour) => ({...colour}));
}

// Starting points for the things this studio is actually asked for, so adding
// "extra dolls" is one click and then a price, not a blank form. Felted animals
// are not here: they have their own panel below, fed by the Add-ons page.
const PRESETS: {key: string; title: string; hint: string; make: () => OptionField}[] = [
  {
    key: "part",
    title: "Part colour",
    hint: "e.g. left bunny, house roof",
    make: () => ({kind: "colour", id: newId(), label: "Left bunny colour", options: colours()})
  },
  {
    key: "doll",
    title: "Dolls",
    hint: "add or remove, clothing colour",
    make: () => ({
      kind: "addon",
      id: newId(),
      label: "Dolls",
      itemLabel: "doll",
      includedCount: 1,
      minCount: 1,
      maxCount: 4,
      unitPriceIdr: 150000,
      fields: [{kind: "colour", id: newId(), label: "Clothing colour", options: colours()}]
    })
  },
  {
    key: "choice",
    title: "Choice list",
    hint: "pick one, optional price",
    make: () => ({
      kind: "choice",
      id: newId(),
      label: "Lining",
      options: [
        {label: "Standard", priceIdr: 0},
        {label: "Silk", priceIdr: 50000}
      ]
    })
  },
  {
    key: "image",
    title: "Reference photos",
    hint: "customer uploads pictures",
    make: () => ({kind: "image", id: newId(), label: "Reference photos", maxFiles: 3})
  },
  {
    key: "text",
    title: "Written note",
    hint: "free text for special requests",
    make: () => ({kind: "text", id: newId(), label: "Special requests", placeholder: "Anything you would like us to know…", maxLength: 300})
  }
];

const KIND_NAME: Record<OptionField["kind"], string> = {
  colour: "Colour pick",
  choice: "Choice list",
  text: "Written note",
  image: "Reference photos",
  addon: "Add-on (counted)"
};

function Money({value, onChange, label}: {value: number; onChange: (next: number) => void; label: string}) {
  return (
    <label className="flex items-center gap-2">
      <span className={labelClass}>{label}</span>
      <span className="flex items-center rounded-lg border border-[#d4c5ab] bg-white pl-3 text-sm text-forest-500 focus-within:border-forest-400">
        Rp
        <input
          type="number"
          min={0}
          step={5000}
          value={value}
          onChange={(event) => onChange(Math.max(0, Math.round(Number(event.target.value) || 0)))}
          className="w-28 rounded-r-lg bg-transparent px-2 py-2 text-sm text-forest-900 outline-none"
        />
      </span>
    </label>
  );
}

function Num({value, onChange, label, min = 0, max = 20}: {value: number; onChange: (next: number) => void; label: string; min?: number; max?: number}) {
  return (
    <label className="flex items-center gap-2">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.min(max, Math.max(min, Math.round(Number(event.target.value) || 0))))}
        className={`${inputClass} w-16`}
      />
    </label>
  );
}

function ChoiceEditor({
  options,
  onChange
}: {
  options: {label: string; priceIdr: number}[];
  onChange: (next: {label: string; priceIdr: number}[]) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            value={option.label}
            onChange={(event) => onChange(options.map((o, i) => (i === index ? {...o, label: event.target.value} : o)))}
            placeholder="Option name"
            aria-label="Option name"
            className={`${inputClass} flex-1`}
          />
          <Money
            label="Adds"
            value={option.priceIdr}
            onChange={(priceIdr) => onChange(options.map((o, i) => (i === index ? {...o, priceIdr} : o)))}
          />
          <button
            type="button"
            onClick={() => onChange(options.filter((_, i) => i !== index))}
            disabled={options.length <= 1}
            aria-label="Remove option"
            className="icon-button flex h-8 w-8 items-center justify-center rounded-full text-forest-500 hover:text-red-600 disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, {label: "", priceIdr: 0}])}
        className="flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
      >
        <Plus className="h-3.5 w-3.5" /> Add option
      </button>
    </div>
  );
}

function SubFieldEditor({field, onChange, onRemove}: {field: SubField; onChange: (next: SubField) => void; onRemove: () => void}) {
  return (
    <div className="rounded-lg border border-[#e4d9c1] bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-600">
          {KIND_NAME[field.kind]}
        </span>
        <input
          value={field.label}
          onChange={(event) => onChange({...field, label: event.target.value})}
          placeholder="What it asks, e.g. Clothing colour"
          aria-label="Question"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove question"
          className="icon-button flex h-8 w-8 items-center justify-center rounded-full text-forest-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3">
        {field.kind === "colour" ? (
          <ColourOptionsEditor label={field.label || "Colour"} options={field.options} onChange={(options) => onChange({...field, options})} />
        ) : field.kind === "choice" ? (
          <ChoiceEditor options={field.options} onChange={(options) => onChange({...field, options})} />
        ) : (
          <input
            value={field.placeholder ?? ""}
            onChange={(event) => onChange({...field, placeholder: event.target.value})}
            placeholder="Hint shown in the box"
            className={`${inputClass} w-full`}
          />
        )}
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  index,
  total,
  onChange,
  onMove,
  onRemove
}: {
  field: OptionField;
  index: number;
  total: number;
  onChange: (next: OptionField) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-[#d4c5ab] bg-[#fffdf9] p-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-[#eee1c4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-forest-800">
          {KIND_NAME[field.kind]}
        </span>
        <input
          value={field.label}
          onChange={(event) => onChange({...field, label: event.target.value} as OptionField)}
          placeholder="Name shown to the customer"
          aria-label="Field name"
          className={`${inputClass} flex-1 font-semibold`}
        />
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move earlier"
          className="icon-button flex h-8 w-8 items-center justify-center rounded-full text-forest-500 hover:text-forest-900 disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="Move later"
          className="icon-button flex h-8 w-8 items-center justify-center rounded-full text-forest-500 hover:text-forest-900 disabled:opacity-30"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove field"
          className="icon-button flex h-8 w-8 items-center justify-center rounded-full text-forest-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4">
        {field.kind === "colour" ? (
          <ColourOptionsEditor label={field.label || "Colour"} options={field.options} onChange={(options) => onChange({...field, options})} />
        ) : null}

        {field.kind === "choice" ? <ChoiceEditor options={field.options} onChange={(options) => onChange({...field, options})} /> : null}

        {field.kind === "text" ? (
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={field.placeholder ?? ""}
              onChange={(event) => onChange({...field, placeholder: event.target.value})}
              placeholder="Hint shown in the box"
              className={`${inputClass} min-w-[14rem] flex-1`}
            />
            <Num label="Max letters" value={field.maxLength} min={20} max={1000} onChange={(maxLength) => onChange({...field, maxLength})} />
          </div>
        ) : null}

        {field.kind === "image" ? (
          <Num label="Most photos" value={field.maxFiles} min={1} max={5} onChange={(maxFiles) => onChange({...field, maxFiles})} />
        ) : null}

        {field.kind === "addon" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <label className="flex items-center gap-2">
                <span className={labelClass}>Each one is a</span>
                <input
                  value={field.itemLabel}
                  onChange={(event) => onChange({...field, itemLabel: event.target.value})}
                  placeholder="doll"
                  className={`${inputClass} w-28`}
                />
              </label>
              <Num label="Comes with" value={field.includedCount} onChange={(includedCount) => onChange({...field, includedCount})} />
              <Num label="Fewest" value={field.minCount} onChange={(minCount) => onChange({...field, minCount})} />
              <Num label="Most" value={field.maxCount} min={1} onChange={(maxCount) => onChange({...field, maxCount})} />
              <Money label="Each extra adds" value={field.unitPriceIdr} onChange={(unitPriceIdr) => onChange({...field, unitPriceIdr})} />
            </div>
            <p className="text-xs text-forest-500">
              The bag&apos;s listed price covers the &ldquo;comes with&rdquo; number. Every one above it adds the amount shown.
            </p>

            <div className="space-y-2">
              <span className={labelClass}>What the customer sets for each one</span>
              {field.fields.map((sub, subIndex) => (
                <SubFieldEditor
                  key={sub.id}
                  field={sub}
                  onChange={(next) => onChange({...field, fields: field.fields.map((s, i) => (i === subIndex ? next : s))})}
                  onRemove={() => onChange({...field, fields: field.fields.filter((_, i) => i !== subIndex)})}
                />
              ))}
              <div className="flex flex-wrap gap-3 pt-1">
                {(
                  [
                    ["colour", "Colour"],
                    ["choice", "Choice list"],
                    ["text", "Written answer"]
                  ] as const
                ).map(([kind, name]) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={field.fields.length >= 8}
                    onClick={() =>
                      onChange({
                        ...field,
                        fields: [
                          ...field.fields,
                          kind === "colour"
                            ? {kind, id: newId(), label: "Colour", options: colours()}
                            : kind === "choice"
                              ? {kind, id: newId(), label: "Type", options: [{label: "Option 1", priceIdr: 0}]}
                              : {kind, id: newId(), label: "Details", placeholder: "", maxLength: 80}
                        ]
                      })
                    }
                    className="flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900 disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" /> {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Which felted animals this product offers: one switch for the whole feature, then either
// every animal or only the ones ticked. Switching Custom Options off above offers none too.
// Selection is drawn with the text colour (a strong outline and a filled dot or tick), so it
// reads the same in light and dark and never depends on a colour that blends in.
type AnimalChoice = {id: string; name: string; active: boolean; photo: string | null};

function AnimalsPanel({value, onChange}: {value: ProductOptions; onChange: (next: ProductOptions) => void}) {
  const [species, setSpecies] = useState<AnimalChoice[] | null>(null);
  const [failed, setFailed] = useState(false);
  const animals = value.animals ?? {mode: "none" as const, speciesIds: []};
  const on = animals.mode !== "none";
  const mode: "all" | "selected" = animals.mode === "selected" ? "selected" : "all";

  useEffect(() => {
    let live = true;
    fetch("/api/admin/addons", {cache: "no-store"})
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error();
        const rows = body.species as {id: string; name: string; active: boolean; images: {url: string; isPrimary: boolean}[]}[];
        if (live) {
          setSpecies(rows.map((row) => ({id: row.id, name: row.name, active: row.active, photo: (row.images.find((image) => image.isPrimary) ?? row.images[0])?.url ?? null})));
        }
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  const setAnimals = (next: Partial<typeof animals>) => onChange({...value, animals: {...animals, ...next}});
  const options: {mode: "all" | "selected"; title: string; hint: string}[] = [
    {mode: "all", title: "All animals", hint: "Every animal that is shown on the Add-ons page"},
    {mode: "selected", title: "Only some animals", hint: "You tick which ones below"}
  ];
  const chosen = species ? species.filter((entry) => animals.speciesIds.includes(entry.id)).length : animals.speciesIds.length;
  const pill = "rounded-lg border border-[#d4c5ab] bg-white px-3 py-1.5 text-xs font-semibold text-forest-900 hover:border-forest-400";

  return (
    <div className="rounded-xl border border-[#d4c5ab]">
      <div className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="font-display text-lg text-forest-900">Felted animals</p>
          <p className="mt-0.5 text-sm text-forest-600">
            Let customers add little felted animals to this piece. Their price, order, colours and photos are set on the Add-ons page.
          </p>
        </div>
        <GlassToggle
          checked={on}
          onChange={(checked) => setAnimals({mode: checked ? (animals.mode === "selected" ? "selected" : "all") : "none"})}
          label="Offer felted animals"
        />
      </div>

      {on ? (
        <div className="space-y-4 border-t border-[#d4c5ab] p-4">
          <div role="radiogroup" aria-label="Which animals to offer" className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => {
              const selected = mode === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnimals({mode: option.mode})}
                  className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left text-forest-900 transition-colors ${
                    selected ? "border-current" : "border-[#d4c5ab] opacity-70 hover:opacity-100"
                  }`}
                >
                  <span aria-hidden className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 border-current">
                    {selected ? <span className="h-2.5 w-2.5 rounded-full bg-current" /> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{option.title}</span>
                    <span className="mt-0.5 block text-xs text-forest-600">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {mode === "selected" ? (
            <div>
              {failed ? <p className="text-sm text-red-600">Could not load the animals. Has the Add-ons migration been run?</p> : null}
              {!species && !failed ? <p className="text-sm text-forest-600">Loading animals...</p> : null}
              {species ? (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-forest-900">
                      {chosen} of {species.length} chosen
                    </p>
                    <div className="flex gap-2">
                      <button type="button" className={pill} onClick={() => setAnimals({speciesIds: species.map((entry) => entry.id)})}>
                        Select all
                      </button>
                      <button type="button" className={pill} onClick={() => setAnimals({speciesIds: []})}>
                        Clear
                      </button>
                    </div>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {species.map((entry) => {
                      const checked = animals.speciesIds.includes(entry.id);
                      return (
                        <li key={entry.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            onClick={() =>
                              setAnimals({speciesIds: checked ? animals.speciesIds.filter((id) => id !== entry.id) : [...animals.speciesIds, entry.id]})
                            }
                            className={`flex w-full items-center gap-3 rounded-xl border-2 p-2 text-left text-forest-900 transition-colors ${
                              checked ? "border-current" : "border-[#d4c5ab] opacity-70 hover:opacity-100"
                            }`}
                          >
                            {entry.photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={entry.photo} alt="" className="h-11 w-11 flex-none rounded-lg object-cover" />
                            ) : (
                              <span aria-hidden className="h-11 w-11 flex-none rounded-lg bg-black/10" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{entry.name}</span>
                              {entry.active ? null : <span className="block text-xs text-forest-600">Hidden on Add-ons</span>}
                            </span>
                            <span aria-hidden className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-current">
                              {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {chosen === 0 ? (
                    <p className="mt-3 text-sm font-medium text-red-600">Nothing is ticked, so customers will see no animals on this piece.</p>
                  ) : (
                    <p className="mt-3 text-xs text-forest-600">An animal that is hidden on the Add-ons page stays off the shop even when ticked here.</p>
                  )}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// The product-form editor for lib/product-options.ts: switch it on for a
// product, then build its list of choices. A product that has never used it
// shows nothing and is untouched.
export function CustomisationBuilder({value, onChange}: {value: ProductOptions; onChange: (next: ProductOptions) => void}) {
  function setField(index: number, next: OptionField) {
    onChange({...value, fields: value.fields.map((f, i) => (i === index ? next : f))});
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.fields.length) return;
    const fields = [...value.fields];
    [fields[index], fields[target]] = [fields[target], fields[index]];
    onChange({...value, fields});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-forest-700">
          Let customers shape this piece: colours for its parts, extra dolls, felted animals, reference photos. Extras can add
          to the price, and everything they choose is saved on their order for you to read.
        </span>
        <GlassToggle checked={value.enabled} onChange={(enabled) => onChange({...value, enabled})} label="Offer custom options" />
      </div>

      {value.enabled ? (
        <>
          <AnimalsPanel value={value} onChange={onChange} />

          <div>
            <span className={labelClass}>Add</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  disabled={value.fields.length >= 24}
                  onClick={() => onChange({...value, fields: [...value.fields, preset.make()]})}
                  className="rounded-full border border-[#d4c5ab] bg-white px-3 py-1.5 text-left text-xs font-semibold text-forest-800 transition-colors hover:border-forest-400 disabled:opacity-40"
                  title={preset.hint}
                >
                  + {preset.title}
                  <span className="ml-1.5 font-normal text-forest-500">{preset.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {value.fields.length ? (
            <div className="space-y-3">
              {value.fields.map((field, index) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  index={index}
                  total={value.fields.length}
                  onChange={(next) => setField(index, next)}
                  onMove={(direction) => move(index, direction)}
                  onRemove={() => onChange({...value, fields: value.fields.filter((_, i) => i !== index)})}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[#d4c5ab] p-4 text-sm text-forest-500">
              Nothing added yet. Pick one of the buttons above to start.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
