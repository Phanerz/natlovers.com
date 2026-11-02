"use client";

import {ArrowDown, ArrowUp, Plus, Trash2} from "lucide-react";
import {
  COLOUR_LIBRARY,
  colourSwatchStyle,
  isRetiredColour,
  isSameColour,
  isValidHex,
  type ColourOption
} from "@/lib/colour-library";

export {isValidHex};

// Shared by Base Colour and Handle Colour in the product form. Each product
// keeps its own ordered list of the colours it offers; the order saved here is
// the order customers see. Colours are added from the master library (see
// lib/colour-library.ts) or entered by hand, and a name or hex edited here
// only changes this product.
export function ColourOptionsEditor({
  label,
  options,
  onChange
}: {
  label: string;
  options: ColourOption[];
  onChange: (next: ColourOption[]) => void;
}) {
  function updateOption(index: number, patch: Partial<ColourOption>) {
    onChange(options.map((option, i) => (i === index ? {...option, ...patch} : option)));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function moveOption(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= options.length) return;
    const next = [...options];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addOption() {
    onChange([...options, {label: "", hex: "#B7924B"}]);
  }

  function addFromLibrary(colour: ColourOption) {
    onChange([...options, {...colour}]);
  }

  const availableLibrary = COLOUR_LIBRARY.filter((colour) => !options.some((option) => isSameColour(option, colour)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="muted">{label} options</span>
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Add custom colour
        </button>
      </div>

      {availableLibrary.length ? (
        <div className="space-y-2">
          <span className="text-xs text-forest-500">Add from the NATLOVERS library:</span>
          <div className="flex flex-wrap items-center gap-2">
            {availableLibrary.map((colour) => (
              <button
                key={colour.label}
                type="button"
                onClick={() => addFromLibrary(colour)}
                className="flex items-center gap-1.5 rounded-full border border-[#d4c5ab] bg-white py-1 pl-1 pr-3 text-xs font-medium text-forest-700 transition-colors duration-150 hover:border-forest-400"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-[#d4c5ab]"
                  style={colourSwatchStyle(colour)}
                  aria-hidden
                />
                {colour.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {options.length ? (
        <div className="space-y-2">
          {options.map((option, index) => {
            const validHex = isValidHex(option.hex);
            const retired = isRetiredColour(option);
            return (
              <div key={index} className="rounded-xl border border-[#d4c5ab] bg-[#fffdf9] p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="aspect-square h-8 w-8 shrink-0 rounded-full border border-[#d4c5ab]"
                    style={colourSwatchStyle(option, validHex)}
                    aria-hidden
                  />
                  <input
                    value={option.label}
                    onChange={(event) => updateOption(index, {label: event.target.value})}
                    placeholder="Colour name, e.g. Rose"
                    aria-label="Colour name"
                    className="min-w-0 flex-1 rounded-lg border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
                  />
                  {option.multicolour ? (
                    <span className="w-28 shrink-0 rounded-lg border border-[#e6dcc6] bg-[#f7f1e2] px-3 py-2 text-center text-xs font-medium text-forest-600">
                      Multicolour
                    </span>
                  ) : (
                    <input
                      value={option.hex}
                      onChange={(event) => updateOption(index, {hex: event.target.value})}
                      placeholder="#B7924B"
                      spellCheck={false}
                      aria-label="Hex code"
                      className={`w-28 shrink-0 rounded-lg border bg-white px-3 py-2 text-sm font-mono outline-none ${
                        option.hex && !validHex ? "border-red-400 text-red-600" : "border-[#d4c5ab] text-forest-900 focus:border-forest-400"
                      }`}
                    />
                  )}
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => moveOption(index, -1)}
                      disabled={index === 0}
                      aria-label="Move earlier"
                      title="Move earlier"
                      className="icon-button flex aspect-square h-8 w-8 shrink-0 items-center justify-center rounded-full text-forest-500 hover:text-forest-900 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveOption(index, 1)}
                      disabled={index === options.length - 1}
                      aria-label="Move later"
                      title="Move later"
                      className="icon-button flex aspect-square h-8 w-8 shrink-0 items-center justify-center rounded-full text-forest-500 hover:text-forest-900 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      aria-label="Remove colour"
                      title="Remove colour"
                      className="icon-button flex aspect-square h-8 w-8 shrink-0 items-center justify-center rounded-full text-forest-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {retired ? (
                  <p className="mt-2 pl-10 text-xs text-[#8a6d2f]">
                    This colour is retired and no longer in the library. It stays as saved; swap it for a library colour when
                    you can.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-forest-500">No colours added yet.</p>
      )}
    </div>
  );
}
