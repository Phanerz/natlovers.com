// Pulls a latitude/longitude pair out of whatever an admin pastes: plain
// coordinates ("-7.7860, 110.3417", also "7.7860 S, 110.3417 E"), or a Google
// Maps link in any of its usual shapes. Pure and dependency free, so both the
// admin form (instant, in the browser) and the geocode API route (after it has
// followed a short link's redirects) use the same rules.
//
// Rounded to 6 decimals to match the locations table's numeric(9,6) columns.

export type Coordinates = {latitude: number; longitude: number};

const NUM = String.raw`-?\d+(?:\.\d+)?`;

function build(lat: string | number, lng: string | number): Coordinates | null {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6))};
}

export function parseCoordinates(input: string): Coordinates | null {
  let text = input.trim();
  if (!text) return null;
  try {
    text = decodeURIComponent(text);
  } catch {
    // Not valid percent-encoding: parse it as typed.
  }

  // Google's exact pin: .../data=!3d-7.786!4d110.341 (preferred over @, which
  // is the map's centre, not necessarily the dropped pin).
  let match = text.match(new RegExp(`!3d(${NUM})!4d(${NUM})`));
  if (match) return build(match[1], match[2]);

  // .../@-7.786,110.341,17z
  match = text.match(new RegExp(`@(${NUM}),\\s*(${NUM})`));
  if (match) return build(match[1], match[2]);

  // ?q=-7.786,110.341  ?ll=...  ?query=...  ?destination=...  ?center=...
  match = text.match(new RegExp(`[?&](?:q|ll|query|destination|center)=(${NUM})\\s*,\\s*(${NUM})`, "i"));
  if (match) return build(match[1], match[2]);

  // Plain "lat, lng" / "lat lng", optionally with degree signs and N/S/E/W.
  match = text.match(new RegExp(`^(${NUM.replace("-?", "")})\\s*°?\\s*([NS])?\\s*[,;]?\\s*(${NUM.replace("-?", "")})\\s*°?\\s*([EW])?$`, "i"));
  if (match) {
    const lat = (match[2]?.toUpperCase() === "S" ? -1 : 1) * Number(match[1]);
    const lng = (match[4]?.toUpperCase() === "W" ? -1 : 1) * Number(match[3]);
    return build(lat, lng);
  }

  // Plain signed pair: "-7.786, 110.341".
  match = text.match(new RegExp(`^(${NUM})\\s*[,;\\s]\\s*(${NUM})$`));
  if (match) return build(match[1], match[2]);

  return null;
}
