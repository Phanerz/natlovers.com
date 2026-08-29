"use client";

import {ChevronDown} from "lucide-react";

// A plain <select> reads as a text field with no visible chevron (browsers
// only draw one when the element keeps its native appearance, which this
// codebase turns off everywhere for a consistent look). Renders a real
// chevron so it's obvious this is a dropdown, and centers the field in
// view on focus so opening it on a long page doesn't leave the option list
// running off-screen.
export function SelectField({
  value,
  onChange,
  children,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => event.target.scrollIntoView({behavior: "smooth", block: "center"})}
        className="w-full appearance-none rounded-lg border border-[#d4c5ab] bg-[#fffdf9] py-3 pl-4 pr-10 text-base text-forest-900 outline-none focus:border-forest-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-500" />
    </div>
  );
}
