"use client";

import {Plus, Trash2} from "lucide-react";
import {TEMPLATE_COLOUR_OPTIONS, type ColourOption} from "./types";

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function isValidHex(hex: string): boolean {
  return HEX_PATTERN.test(hex.trim());
}

// Shared by Base Colour and Handle Colour in the product form - each option
// is a real admin-entered hex code with a live swatch preview, not a pick
// from a fixed palette, since different products can offer genuinely
// different colour choices.
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

  function addOption() {
    onChange([...options, {label: "", hex: "#B7924B"}]);
  }

  function addTemplate(template: ColourOption) {
    onChange([...options, {...template}]);
  }

  const availableTemplates = TEMPLATE_COLOUR_OPTIONS.filter(
    (template) => !options.some((option) => option.label.trim().toLowerCase() === template.label.toLowerCase())
  );

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
          Add colour
        </button>
      </div>

      {availableTemplates.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-forest-500">Quick add:</span>
          {availableTemplates.map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => addTemplate(template)}
              className="flex items-center gap-1.5 rounded-full border border-[#d4c5ab] bg-white py-1 pl-1 pr-3 text-xs font-medium text-forest-700 transition-colors duration-150 hover:border-forest-400"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-[#d4c5ab]"
                style={{backgroundColor: template.hex}}
                aria-hidden
              />
              {template.label}
            </button>
          ))}
        </div>
      ) : null}

      {options.length ? (
        <div className="space-y-2">
          {options.map((option, index) => {
            const validHex = isValidHex(option.hex);
            return (
              <div key={index} className="flex items-center gap-2 rounded-xl border border-[#d4c5ab] bg-[#fffdf9] p-2.5">
                <span
                  className="h-8 w-8 shrink-0 rounded-full border border-[#d4c5ab]"
                  style={{backgroundColor: validHex ? option.hex : "transparent"}}
                  aria-hidden
                />
                <input
                  value={option.label}
                  onChange={(event) => updateOption(index, {label: event.target.value})}
                  placeholder="Colour name, e.g. Rose"
                  className="min-w-0 flex-1 rounded-lg border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
                />
                <input
                  value={option.hex}
                  onChange={(event) => updateOption(index, {hex: event.target.value})}
                  placeholder="#B7924B"
                  spellCheck={false}
                  className={`w-28 rounded-lg border bg-white px-3 py-2 text-sm font-mono outline-none ${
                    option.hex && !validHex ? "border-red-400 text-red-600" : "border-[#d4c5ab] text-forest-900 focus:border-forest-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  aria-label="Remove colour"
                  className="icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-forest-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
