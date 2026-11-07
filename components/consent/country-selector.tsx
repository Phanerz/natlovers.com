"use client";

import {useEffect, useId, useMemo, useRef, useState} from "react";
import {Check, ChevronDown, Search} from "lucide-react";
import {countryList, countryName} from "@/lib/countries";
import {CountryFlag} from "@/components/consent/country-flag";

const PAGE = 60;

// A searchable list of every country, with the one we detected at the top. Opens inline under the
// button rather than floating, so it never gets clipped on a small screen.
export function CountrySelector({
  value,
  detected,
  onChange
}: {
  value: string | null;
  detected: string | null;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(PAGE);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const all = countryList();
    const needle = query.trim().toLowerCase();
    let matches = needle ? all.filter((country) => country.name.toLowerCase().includes(needle) || country.code.toLowerCase() === needle) : all;
    if (needle) {
      // Names that start with what was typed come first.
      matches = [...matches].sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)));
    } else if (detected) {
      const found = all.find((country) => country.code === detected);
      if (found) matches = [found, ...all.filter((country) => country.code !== detected)];
    }
    return matches;
  }, [query, detected]);

  const shown = results.slice(0, limit);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({block: "nearest"});
  }, [active, open]);

  function close(returnFocus = true) {
    setOpen(false);
    setQuery("");
    setActive(0);
    setLimit(PAGE);
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(code: string) {
    onChange(code);
    close();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(Math.min(active + 1, shown.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = shown[active];
      if (picked) choose(picked.code);
    } else if (event.key === "Escape") {
      // Closes the list only; the dialog around it stays open.
      event.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
      close();
    }
  }

  return (
    <div className="nlc-field">
      <span className="nlc-label" id={`${listId}-label`}>
        Country or region
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="nlc-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listId}-label ${listId}-value`}
        onClick={() => (open ? close(false) : setOpen(true))}
      >
        {value ? <CountryFlag code={value} /> : <span className="nlc-flag nlc-flag--empty" aria-hidden />}
        <span id={`${listId}-value`} className="nlc-select__value">
          {value ? countryName(value) : "Choose your country"}
        </span>
        <ChevronDown aria-hidden className={`nlc-select__chevron ${open ? "is-open" : ""}`} />
      </button>

      {open ? (
        <div className="nlc-listbox" onKeyDown={onKeyDown}>
          <label className="nlc-search">
            <Search aria-hidden className="h-4 w-4" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={shown[active] ? `${listId}-${shown[active].code}` : undefined}
              aria-autocomplete="list"
              aria-label="Search countries"
              placeholder="Search countries"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
                setLimit(PAGE);
              }}
            />
          </label>
          <ul ref={listRef} id={listId} role="listbox" aria-label="Countries" className="nlc-options">
            {shown.map((country, index) => (
              <li
                key={country.code}
                id={`${listId}-${country.code}`}
                role="option"
                aria-selected={country.code === value}
                data-active={index === active}
                className="nlc-option"
                onMouseMove={() => setActive(index)}
                onClick={() => choose(country.code)}
              >
                <CountryFlag code={country.code} />
                <span className="nlc-option__name">{country.name}</span>
                {country.code === detected && !query ? <span className="nlc-option__tag">Detected</span> : null}
                {country.code === value ? <Check aria-hidden className="h-4 w-4 shrink-0" /> : null}
              </li>
            ))}
            {!shown.length ? <li className="nlc-empty">No country matches &ldquo;{query}&rdquo;.</li> : null}
          </ul>
          {results.length > limit ? (
            <button type="button" className="nlc-more" onClick={() => setLimit(results.length)}>
              Show all {results.length} countries
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
