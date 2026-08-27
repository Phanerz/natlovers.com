"use client";

import {Plus, Trash2} from "lucide-react";

// Same shape as ColourOptionsEditor but for a free-text axis with no hex
// swatch  -  see the "has_personalisation" schema comment in lib/db/schema.ts
// for why this is a separate, simpler component rather than reusing the
// colour editor with hex hidden.
export function PersonalisationOptionsEditor({options, onChange}: {options: string[]; onChange: (next: string[]) => void}) {
  function updateOption(index: number, label: string) {
    onChange(options.map((option, i) => (i === index ? label : option)));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  function addOption() {
    onChange([...options, ""]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="muted">Personalisation options</span>
        <button
          type="button"
          onClick={addOption}
          className="flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Add option
        </button>
      </div>

      {options.length ? (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] p-2.5">
              <input
                value={option}
                onChange={(event) => updateOption(index, event.target.value)}
                placeholder="e.g. Initials (Embroidery)"
                className="min-w-0 flex-1 rounded-lg border border-[#d4c5ab] bg-white px-3 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
              />
              <button
                type="button"
                onClick={() => removeOption(index)}
                aria-label="Remove option"
                className="icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-forest-500 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-forest-500">No options added yet.</p>
      )}
    </div>
  );
}
