"use client";

import {useEffect, useMemo, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {ChevronDown, Search} from "lucide-react";
import type {Country} from "react-phone-number-input";
import {getCountryCallingCode} from "react-phone-number-input";
import {useClickOutside} from "@/components/use-click-outside";

type CountryOption = {value?: Country; label: string; divider?: boolean};

// react-phone-number-input's own flag component, passed down as
// `iconComponent`. Its actual runtime call shape (see the library's
// CountrySelectWithIcon source) is looser than its declared .d.ts, so this
// stays a local, permissive type rather than fighting that mismatch.
type FlagComponent = React.ComponentType<{country?: Country; label?: string; "aria-hidden"?: boolean}>;

function dialCode(country?: Country) {
  if (!country) return "";
  try {
    return `+${getCountryCallingCode(country)}`;
  } catch {
    return "";
  }
}

// Replaces react-phone-number-input's default country picker, which is a
// native <select> (see CountrySelectWithIcon in the library) - a native
// select is entirely browser-chrome, no CSS or animation reaches inside it,
// which is exactly why the old dropdown had no motion at all. This is a
// real custom listbox instead, animated the same way every other floating
// menu on the site is (see components/admin/pill-dropdown.tsx: short
// scale+y+opacity, easeOut), with a search field since the country list is
// the full ITU set (~240 entries, not a short pick-one-of-five list).
export function CountrySelect({
  value,
  options,
  onChange,
  iconComponent: Icon,
  disabled,
  "aria-label": ariaLabel
}: {
  value?: Country;
  options: CountryOption[];
  onChange: (value?: Country) => void;
  iconComponent: FlagComponent;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  useEffect(() => {
    if (open) {
      setQuery("");
      const id = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const realOptions = useMemo(() => options.filter((option) => !option.divider && option.value), [options]);
  const current = realOptions.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return realOptions;
    return realOptions.filter(
      (option) => option.label.toLowerCase().includes(term) || dialCode(option.value).includes(term)
    );
  }, [realOptions, query]);

  function select(option: CountryOption) {
    setOpen(false);
    onChange(option.value);
  }

  return (
    <div ref={containerRef} className="relative flex shrink-0 items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="button-lift flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-sm text-forest-900 transition-colors duration-150 hover:bg-[#f0e7d4] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon aria-hidden country={value} label={current?.label} />
        <span className="font-medium tabular-nums text-forest-700">{dialCode(value)}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-forest-500 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="country-select-menu"
            role="listbox"
            initial={{opacity: 0, scale: 0.96, y: -4}}
            animate={{opacity: 1, scale: 1, y: 0}}
            exit={{opacity: 0, scale: 0.97, y: -2}}
            transition={{duration: 0.14, ease: "easeOut"}}
            className="absolute left-0 top-full z-30 mt-1.5 w-72 origin-top-left overflow-hidden rounded-xl border border-[#d7cab2] bg-[#fffaf1] shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
          >
            <div className="border-b border-[#e4d9c1] p-2">
              <div className="flex items-center gap-2 rounded-lg border border-[#e4d9c1] bg-white px-3 py-1.5">
                <Search className="h-3.5 w-3.5 shrink-0 text-forest-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setOpen(false);
                    if (event.key === "Enter" && filtered[0]) select(filtered[0]);
                  }}
                  placeholder="Search country or code"
                  className="w-full bg-transparent text-sm text-forest-900 outline-none placeholder:text-forest-400"
                />
              </div>
            </div>

            <div role="presentation" className="max-h-64 overflow-y-auto p-1.5">
              {filtered.length ? (
                filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => select(option)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors duration-150 ${
                      option.value === value ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-[#f0e7d4]"
                    }`}
                  >
                    <Icon aria-hidden country={option.value} label={option.label} />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span
                      className={`shrink-0 tabular-nums text-xs ${option.value === value ? "text-sand-100" : "text-forest-400"}`}
                    >
                      {dialCode(option.value)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="px-2.5 py-4 text-center text-sm text-forest-500">No matching country.</p>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
