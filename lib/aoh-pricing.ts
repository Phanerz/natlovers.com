export type Jenis = "Emboss Cekung" | "Emboss Datar" | "Emboss & Hotstamp" | "Hot Stamp" | "Resin";

export const JENIS_ORDER: Jenis[] = [
  "Emboss Cekung",
  "Emboss Datar",
  "Emboss & Hotstamp",
  "Hot Stamp",
  "Resin"
];

export type RateRow = Partial<Record<Jenis, number>>;

export type DepthGroup = {
  id: string;
  label: string;
  tebalOptions: number[];
  rates: Record<number, RateRow>;
};

export const DEFAULT_PRICE_DATA: DepthGroup[] = [
  {
    id: "1.5-2mm",
    label: "Kedalaman 1,5mm & 2mm",
    tebalOptions: [1.5, 2, 3, 4, 5, 6, 7],
    rates: {
      1.5: {"Hot Stamp": 1300, Resin: 900},
      2: {"Emboss Cekung": 4500, "Emboss Datar": 3500, "Hot Stamp": 2000, Resin: 900},
      3: {"Emboss Cekung": 5100, "Emboss Datar": 4500, "Emboss & Hotstamp": 7200, "Hot Stamp": 2500, Resin: 900},
      4: {"Emboss Cekung": 6500, "Emboss Datar": 5100, "Emboss & Hotstamp": 8200, "Hot Stamp": 3000, Resin: 900},
      5: {"Emboss Cekung": 7500, "Emboss Datar": 6500, "Emboss & Hotstamp": 8700, "Hot Stamp": 3500, Resin: 900},
      6: {"Emboss Cekung": 8500, "Emboss Datar": 7500, "Emboss & Hotstamp": 9200, "Hot Stamp": 4100, Resin: 900},
      7: {"Emboss Cekung": 9500, "Emboss Datar": 8500, "Emboss & Hotstamp": 9212, "Hot Stamp": 4300, Resin: 900}
    }
  },
  {
    id: "3-4mm",
    label: "Kedalaman 3mm & 4mm",
    tebalOptions: [7, 10],
    rates: {
      7: {"Hot Stamp": 8000},
      10: {"Hot Stamp": 9200}
    }
  }
];

export type AohSettings = {
  ongkirDefault: number;
  marginDefault: number;
  marginMin: number;
  marginMax: number;
  marginStep: number;
  quoteJudul: string;
  quotePenutup: string;
  namaToko: string;
};

export const DEFAULT_SETTINGS: AohSettings = {
  ongkirDefault: 19000,
  marginDefault: 1.7,
  marginMin: 1.2,
  marginMax: 2.5,
  marginStep: 0.05,
  quoteJudul: "PENAWARAN KLISE KUNINGAN",
  quotePenutup:
    "Harga sudah termasuk ongkos kirim, mengacu pada daftar harga terbaru dan dapat berubah sewaktu-waktu mengikuti fluktuasi harga bahan baku kuningan.",
  namaToko: "Alfa Omega Hardware"
};

export function fmtRp(n: number) {
  if (!Number.isFinite(n)) n = 0;
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export function fmtAngka(n: number, maxDecimals = 2) {
  if (!Number.isFinite(n)) n = 0;
  return n.toLocaleString("id-ID", {maximumFractionDigits: maxDecimals});
}

export function fmtKoma(n: number, decimals = 2) {
  if (!Number.isFinite(n)) n = 0;
  return n.toFixed(decimals).replace(".", ",");
}

const STORAGE_KEY_DATA = "aoh-pricing-data-v1";
const STORAGE_KEY_SETTINGS = "aoh-pricing-settings-v1";

export function loadPriceData(): DepthGroup[] {
  if (typeof window === "undefined") return DEFAULT_PRICE_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DATA);
    if (!raw) return DEFAULT_PRICE_DATA;
    const parsed = JSON.parse(raw) as DepthGroup[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PRICE_DATA;
    return parsed;
  } catch {
    return DEFAULT_PRICE_DATA;
  }
}

export function savePriceData(data: DepthGroup[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
}

export function loadSettings(): AohSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AohSettings>;
    return {...DEFAULT_SETTINGS, ...parsed};
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AohSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
}

// Shared server-side copy so rates/settings follow whoever touched them
// last across every device, not just the browser that saved them —
// localStorage above stays as the instant, offline-safe local cache.
export async function fetchRemoteConfig(): Promise<{priceData: DepthGroup[] | null; settings: AohSettings | null}> {
  try {
    const response = await fetch("/api/aoh/settings", {cache: "no-store"});
    if (!response.ok) return {priceData: null, settings: null};
    const data = (await response.json()) as {priceData: DepthGroup[] | null; settings: Partial<AohSettings> | null};
    return {
      priceData: data.priceData ?? null,
      settings: data.settings ? {...DEFAULT_SETTINGS, ...data.settings} : null
    };
  } catch {
    return {priceData: null, settings: null};
  }
}

export async function pushRemoteConfig(priceData: DepthGroup[], settings: AohSettings) {
  try {
    await fetch("/api/aoh/settings", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({priceData, settings})
    });
  } catch {
    // Offline or the request failed — localStorage already has the latest
    // value on this device, and the next successful change will retry.
  }
}
