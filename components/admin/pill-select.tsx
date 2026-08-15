"use client";

function PillOption({label, active, onClick}: {label: string; active: boolean; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-sm font-medium ${active ? "glass-btn-primary text-[#fff8eb]" : "glass-btn-secondary text-forest-700"}`}
    >
      {label}
    </button>
  );
}

export function PillSingleSelect<T extends string>({
  label,
  options,
  getLabel,
  value,
  onChange
}: {
  label: string;
  options: readonly T[];
  getLabel: (option: T) => string;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <span className="muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <PillOption key={option} label={getLabel(option)} active={option === value} onClick={() => onChange(option)} />
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
  onChange
}: {
  label: string;
  options: readonly T[];
  getLabel: (option: T) => string;
  value: T[];
  onChange: (value: T[]) => void;
}) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <div className="space-y-2">
      <span className="muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <PillOption key={option} label={getLabel(option)} active={value.includes(option)} onClick={() => toggle(option)} />
        ))}
      </div>
    </div>
  );
}
