"use client";

import {useState} from "react";
import {X} from "lucide-react";

// Generic removable-chip text input, shared by Tags and Collections in the
// Organisation card. Enter or comma commits the current text as a new chip;
// backspace on an empty field removes the last one, matching the usual
// chip-input convention.
export function ChipInput({
  values,
  onChange,
  placeholder
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!values.some((value) => value.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function remove(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-2.5 py-2 focus-within:border-forest-400">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="flex items-center gap-1 rounded-full bg-[#eee1c4] py-1 pl-2.5 pr-1.5 text-xs font-medium text-forest-800"
        >
          {value}
          <button
            type="button"
            onClick={() => remove(index)}
            aria-label={`Remove ${value}`}
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-forest-600 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(event) => {
          if (event.target.value.endsWith(",")) {
            setDraft(event.target.value.slice(0, -1));
            commit();
            return;
          }
          setDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Backspace" && !draft && values.length) {
            remove(values.length - 1);
          }
        }}
        onBlur={commit}
        placeholder={values.length ? "" : placeholder}
        className="min-w-[6rem] flex-1 bg-transparent py-0.5 text-sm text-forest-900 outline-none placeholder:text-forest-400"
      />
    </div>
  );
}
