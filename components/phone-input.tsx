"use client";

import PhoneInputPrimitive from "react-phone-number-input";
import "react-phone-number-input/style.css";

// Every ITU-assigned country calling code, sourced from libphonenumber-js's
// metadata (what this library is built on) rather than a hand-maintained
// list — that's the only way to credibly promise "every country, none
// missing." The flag dropdown carries the country/calling-code, so the
// number field itself renders using that country's own national format
// (e.g. a US number reads "(757) 123-4567") instead of a bare "+62"-style
// string with no visual structure.
export function PhoneInput({
  value,
  onChange,
  required,
  compact,
  id
}: {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  compact?: boolean;
  id?: string;
}) {
  return (
    <PhoneInputPrimitive
      id={id}
      defaultCountry="ID"
      value={value}
      onChange={(next) => onChange(next ?? "")}
      required={required}
      countrySelectProps={{"aria-label": "Country calling code"}}
      numberInputProps={{"aria-label": "Phone number"}}
      className={`natlovers-phone-input${compact ? " is-compact" : ""}`}
    />
  );
}
