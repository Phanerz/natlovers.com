// Every country the location picker offers, as two-letter ISO codes. The flag pictures live in
// public/flags (from the MIT-licensed flag-icons set, see public/flags/LICENSE.txt), one file per
// code, served from this site so no outside service is contacted when a flag is shown.
export const COUNTRY_CODES: readonly string[] = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS",
  "BT", "BV", "BW", "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM", "DO", "DZ", "EC", "EE",
  "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF",
  "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT", "JE", "JM",
  "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC",
  "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ", "NA",
  "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ", "OM", "PA", "PC", "PE", "PF",
  "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU",
  "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR",
  "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN",
  "TO", "TR", "TT", "TV", "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG",
  "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW"
];

export type Country = {code: string; name: string};

let cachedList: Country[] | null = null;

// Country names in English, in alphabetical order. The names come from the browser, so they stay
// up to date without a hand-kept list.
export function countryList(): Country[] {
  if (cachedList) return cachedList;
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], {type: "region"});
  } catch {
    names = null;
  }
  cachedList = COUNTRY_CODES.map((code) => ({code, name: names?.of(code) ?? code}))
    .filter((country) => country.name !== country.code || !names)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  return cachedList;
}

export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  const upper = code.toUpperCase();
  return countryList().find((country) => country.code === upper)?.name ?? upper;
}

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_CODES.includes(value.toUpperCase());
}

export function flagSrc(code: string): string {
  return "/flags/" + code.toLowerCase() + ".svg";
}
