"use client";

import {useMemo, useState, type CSSProperties} from "react";
import PhoneInputPrimitive, {getCountryCallingCode, parsePhoneNumber} from "react-phone-number-input";
import type {Country} from "react-phone-number-input";
import baseLabels from "react-phone-number-input/locale/en.json";
import "react-phone-number-input/style.css";

// Every ITU-assigned country calling code, sourced from libphonenumber-js's
// metadata (what this library is built on) rather than a hand-maintained
// list — that's the only way to credibly promise "every country, none
// missing." The flag dropdown carries the country/calling-code, so the
// number field itself renders using that country's own national format
// (e.g. a US number reads "(757) 123-4567") instead of a bare "+62"-style
// string with no visual structure.

const DEFAULT_COUNTRY: Country = "ID";

// en.json is keyed by country code plus three UI strings ("ext", "country",
// "phone") that are not countries at all, and "ZZ" which is the
// "International" entry. Only real countries get a calling code appended —
// getCountryCallingCode throws for anything else, which is exactly the
// signal used to leave those entries alone.
const labelsWithCallingCode: Record<string, string> = Object.fromEntries(
  Object.entries(baseLabels as Record<string, string>).map(([code, label]) => {
    try {
      return [code, `${label} (+${getCountryCallingCode(code as Country)})`];
    } catch {
      return [code, label];
    }
  })
);

// The dial code is displayed, never typed. It is rendered as a CSS
// pseudo-element fed by this custom property (see .PhoneInputCountry::after
// in globals.css) rather than as a text node inside the field, so there is
// no way to put a caret in it — it changes only by picking a different
// country from the dropdown, which is what the library already enforces for
// the underlying value.
function dialCodeVariable(country: Country | undefined): CSSProperties {
  if (!country) {
    return {"--natlovers-dial-code": '""'} as CSSProperties;
  }
  try {
    return {"--natlovers-dial-code": `"+${getCountryCallingCode(country)}"`} as CSSProperties;
  } catch {
    return {"--natlovers-dial-code": '""'} as CSSProperties;
  }
}

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
  // Seeded from the stored number so an existing profile opens showing the
  // code it was actually saved with, not the default.
  const initialCountry = useMemo(() => {
    if (!value) return DEFAULT_COUNTRY;
    try {
      return parsePhoneNumber(value)?.country ?? DEFAULT_COUNTRY;
    } catch {
      return DEFAULT_COUNTRY;
    }
  }, [value]);

  const [country, setCountry] = useState<Country | undefined>(initialCountry);

  return (
    <PhoneInputPrimitive
      id={id}
      defaultCountry={DEFAULT_COUNTRY}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      onCountryChange={(next) => setCountry(next ?? undefined)}
      required={required}
      labels={labelsWithCallingCode}
      countrySelectProps={{"aria-label": "Country calling code"}}
      numberInputProps={{"aria-label": "Phone number"}}
      style={dialCodeVariable(country)}
      className={`natlovers-phone-input${compact ? " is-compact" : ""}`}
    />
  );
}
