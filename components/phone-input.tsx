"use client";

import PhoneInputPrimitive, {getCountryCallingCode} from "react-phone-number-input";
import type {Country} from "react-phone-number-input";
import baseLabels from "react-phone-number-input/locale/en.json";
import "react-phone-number-input/style.css";
import {CountrySelect} from "@/components/country-select";

// Every ITU-assigned country calling code, sourced from libphonenumber-js's
// metadata (what this library is built on) rather than a hand-maintained
// list  -  that's the only way to credibly promise "every country, none
// missing." The flag dropdown carries the country/calling-code, so the
// number field itself renders using that country's own national format
// (e.g. a US number reads "(757) 123-4567") instead of a bare "+62"-style
// string with no visual structure.

const DEFAULT_COUNTRY: Country = "ID";

// en.json is keyed by country code plus three UI strings ("ext", "country",
// "phone") that are not countries at all, and "ZZ" which is the
// "International" entry. Only real countries get a calling code appended  -
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
      defaultCountry={DEFAULT_COUNTRY}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      required={required}
      labels={labelsWithCallingCode}
      countrySelectComponent={CountrySelect}
      countrySelectProps={{"aria-label": "Country calling code"}}
      numberInputProps={{"aria-label": "Phone number"}}
      className={`natlovers-phone-input${compact ? " is-compact" : ""}`}
    />
  );
}
