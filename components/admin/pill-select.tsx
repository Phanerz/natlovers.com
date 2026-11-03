"use client";

// The one pill used for every choice in the admin Attributes section, so
// Material, Size, Shape, Handle and Accessory category all look and behave
// the same: a calm cream capsule at rest, solid forest green when chosen.
// No gradients, bevels or hover motion  -  just a colour change.
const pillBase =
  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium leading-none outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-forest-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffdf9]";

export function pillClassName(active: boolean): string {
  // Colours live in .apill (globals.css) so dark mode can restyle every state;
  // hard-coded utility colours were remapped there and left some text unreadable.
  return `${pillBase} apill${active ? " apill-on" : ""}`;
}

// The small numbered badge on a pill whose choice becomes a digit in the SKU.
export function PillCode({code, active}: {code: string; active: boolean}) {
  return (
    <span
      className={`apill-code flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums${active ? " apill-code-on" : ""}`}
      aria-hidden
    >
      {code}
    </span>
  );
}

export function PillOption({
  label,
  code,
  active,
  onClick
}: {
  label: string;
  code?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={pillClassName(active)}>
      {code ? <PillCode code={code} active={active} /> : null}
      {label}
      {code ? <span className="sr-only"> (SKU code {code})</span> : null}
    </button>
  );
}

// `bare` renders just the pills, for a caller that supplies its own label
// (the attribute rows in product-form.tsx). `getCode` shows each option's SKU
// digit, read from the central code tables in lib/product-sku.ts  -  the
// number is the stored code, never the option's position in the row.
export function PillSingleSelect<T extends string>({
  label,
  options,
  getLabel,
  getCode,
  value,
  onChange,
  bare
}: {
  label: string;
  options: readonly T[];
  getLabel: (option: T) => string;
  getCode?: (option: T) => string | undefined;
  // null = nothing picked yet (no pill shows as selected).
  value: T | null;
  onChange: (value: T) => void;
  bare?: boolean;
}) {
  return (
    <div className="space-y-2">
      {bare ? null : <span className="muted">{label}</span>}
      <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
        {options.map((option) => (
          <PillOption
            key={option}
            label={getLabel(option)}
            code={getCode?.(option)}
            active={option === value}
            onClick={() => onChange(option)}
          />
        ))}
      </div>
    </div>
  );
}

export function PillMultiSelect<T extends string>({
  label,
  options,
  getLabel,
  value,
  onChange,
  bare
}: {
  label: string;
  options: readonly T[];
  getLabel: (option: T) => string;
  value: T[];
  onChange: (value: T[]) => void;
  bare?: boolean;
}) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <div className="space-y-2">
      {bare ? null : <span className="muted">{label}</span>}
      <div role="group" aria-label={label} className="flex flex-wrap gap-2.5">
        {options.map((option) => (
          <PillOption key={option} label={getLabel(option)} active={value.includes(option)} onClick={() => toggle(option)} />
        ))}
      </div>
    </div>
  );
}
