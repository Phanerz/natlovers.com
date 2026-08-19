"use client";

import {useEffect, useMemo, useState} from "react";
import {motion, useReducedMotion} from "framer-motion";
import {Check, Copy, RotateCcw, Settings} from "lucide-react";
import {BackgroundMesh} from "@/components/aoh/background-mesh";
import {GlassSelect} from "@/components/aoh/glass-select";
import {MarginSlider} from "@/components/aoh/margin-slider";
import {AnimatedNumber} from "@/components/aoh/animated-number";
import {SettingsPanel} from "@/components/aoh/settings-panel";
import {
  DEFAULT_PRICE_DATA,
  DEFAULT_SETTINGS,
  JENIS_ORDER,
  fmtRp,
  fmtAngka,
  loadPriceData,
  loadSettings,
  savePriceData,
  saveSettings,
  type AohSettings,
  type DepthGroup,
  type Jenis
} from "@/lib/aoh-pricing";

export function AohCalculator() {
  const reduceMotion = useReducedMotion();
  const spring = {type: "spring" as const, stiffness: 380, damping: 30};

  const [hydrated, setHydrated] = useState(false);
  const [priceData, setPriceData] = useState<DepthGroup[]>(DEFAULT_PRICE_DATA);
  const [settings, setSettings] = useState<AohSettings>(DEFAULT_SETTINGS);

  const [groupId, setGroupId] = useState(DEFAULT_PRICE_DATA[0].id);
  const [tebal, setTebal] = useState(DEFAULT_PRICE_DATA[0].tebalOptions[0]);
  const [jenis, setJenis] = useState<Jenis>("Hot Stamp");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [ongkir, setOngkir] = useState(String(DEFAULT_SETTINGS.ongkirDefault));
  const [margin, setMargin] = useState(DEFAULT_SETTINGS.marginDefault);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quoteDirty, setQuoteDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const savedData = loadPriceData();
    const savedSettings = loadSettings();
    setPriceData(savedData);
    setSettings(savedSettings);
    setOngkir(String(savedSettings.ongkirDefault));
    setMargin(savedSettings.marginDefault);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePriceData(priceData);
  }, [priceData, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings(settings);
  }, [settings, hydrated]);

  const currentGroup = useMemo(
    () => priceData.find((group) => group.id === groupId) ?? priceData[0],
    [priceData, groupId]
  );

  useEffect(() => {
    if (!currentGroup.tebalOptions.includes(tebal)) {
      setTebal(currentGroup.tebalOptions[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGroup]);

  const rateRow = currentGroup.rates[tebal] ?? {};
  const availableJenis = useMemo(
    () => JENIS_ORDER.filter((j) => rateRow[j] !== undefined),
    [rateRow]
  );

  useEffect(() => {
    if (availableJenis.length > 0 && !availableJenis.includes(jenis)) {
      setJenis(availableJenis[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableJenis]);

  const rate = rateRow[jenis] ?? 0;
  const w = parseFloat(width.replace(",", ".")) || 0;
  const h = parseFloat(height.replace(",", ".")) || 0;
  const ongkirValue = parseFloat(ongkir) || 0;

  const luas = w * h;
  const biayaProduksi = luas * rate;
  const modal = biayaProduksi + ongkirValue;
  const hargaJual = modal * margin;
  const profit = hargaJual - modal;

  const autoQuoteText = useMemo(() => {
    const depthLabel = currentGroup.label.replace("Kedalaman ", "");
    return [
      settings.quoteJudul,
      settings.namaToko,
      "",
      `Spesifikasi   : Klise kuningan ${jenis || "-"}`,
      `Kedalaman     : ${depthLabel}`,
      `Tebal plat    : ${tebal} mm`,
      `Ukuran matras : ${width || "0"} x ${height || "0"} cm (luas ${fmtAngka(luas)} cm2)`,
      `Ongkos kirim  : ${fmtRp(ongkirValue)}`,
      "",
      `Total harga   : ${fmtRp(hargaJual)}`,
      "",
      settings.quotePenutup
    ].join("\n");
  }, [currentGroup, jenis, tebal, width, height, luas, ongkirValue, hargaJual, settings]);

  useEffect(() => {
    if (!quoteDirty) {
      setQuoteText(autoQuoteText);
    }
  }, [autoQuoteText, quoteDirty]);

  function handleResetQuote() {
    setQuoteText(autoQuoteText);
    setQuoteDirty(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(quoteText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied or unavailable — nothing more we can do here
    }
  }

  function handleRateChange(targetGroupId: string, targetTebal: number, targetJenis: Jenis, nextRate: number) {
    setPriceData((prev) =>
      prev.map((group) => {
        if (group.id !== targetGroupId) return group;
        return {
          ...group,
          rates: {
            ...group.rates,
            [targetTebal]: {
              ...group.rates[targetTebal],
              [targetJenis]: nextRate
            }
          }
        };
      })
    );
  }

  function handleResetPricing() {
    setPriceData(DEFAULT_PRICE_DATA);
    setSettings(DEFAULT_SETTINGS);
    setOngkir(String(DEFAULT_SETTINGS.ongkirDefault));
    setMargin(DEFAULT_SETTINGS.marginDefault);
  }

  const tapAnim = reduceMotion ? undefined : {scale: 0.94};

  return (
    <main className="aoh-page relative min-h-[100dvh] text-[var(--aoh-ink)]">
      <BackgroundMesh />

      <div
        className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-5 px-4 pb-8"
        style={{
          paddingTop: "calc(1.75rem + env(safe-area-inset-top))",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
          paddingLeft: "calc(1rem + env(safe-area-inset-left))",
          paddingRight: "calc(1rem + env(safe-area-inset-right))"
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#d9a75c]">
              Alfa Omega Hardware
            </p>
            <h1 className="mt-1 text-2xl font-semibold leading-tight text-[var(--aoh-ink)]">
              Kalkulator Harga Klise
            </h1>
          </div>
          <motion.button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            whileTap={tapAnim}
            transition={spring}
            aria-label="Pengaturan harga"
            className={`aoh-squircle-sm flex h-11 w-11 shrink-0 items-center justify-center border border-white/10 ${
              settingsOpen ? "bg-white/15" : "bg-white/5"
            }`}
          >
            <Settings size={18} />
          </motion.button>
        </div>

        <SettingsPanel
          open={settingsOpen}
          priceData={priceData}
          settings={settings}
          onRateChange={handleRateChange}
          onSettingsChange={setSettings}
          onReset={handleResetPricing}
        />

        <section className="aoh-squircle aoh-glass flex flex-col gap-4 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">Spesifikasi klise</p>
          <div className="grid grid-cols-2 gap-3">
            <GlassSelect
              label="Kedalaman"
              value={groupId}
              onChange={setGroupId}
              options={priceData.map((group) => ({value: group.id, label: group.label}))}
            />
            <GlassSelect
              label="Tebal"
              value={String(tebal)}
              onChange={(value) => setTebal(parseFloat(value))}
              options={currentGroup.tebalOptions.map((option) => ({
                value: String(option),
                label: `${option} mm`
              }))}
            />
          </div>
          <GlassSelect
            label="Jenis"
            value={jenis}
            onChange={(value) => setJenis(value as Jenis)}
            disabled={availableJenis.length === 0}
            options={availableJenis.map((option) => ({
              value: option,
              label: option,
              hint: fmtRp(rateRow[option] ?? 0) + "/cm2"
            }))}
          />
          {availableJenis.length === 0 ? (
            <p className="font-mono text-[11px] text-[#d19169]">
              Tidak tersedia untuk kombinasi kedalaman dan tebal ini.
            </p>
          ) : null}
        </section>

        <section className="aoh-squircle aoh-glass flex flex-col gap-4 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">Ukuran &amp; ongkos</p>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
              Ukuran matras (cm)
            </span>
            <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Lebar"
                value={width}
                onChange={(event) => setWidth(event.target.value)}
                className="aoh-squircle-sm min-h-[52px] border border-white/10 bg-white/5 px-4 text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
              />
              <span className="text-white/30">&times;</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Tinggi"
                value={height}
                onChange={(event) => setHeight(event.target.value)}
                className="aoh-squircle-sm min-h-[52px] border border-white/10 bg-white/5 px-4 text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
              />
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">Ongkir (Rp)</span>
            <input
              type="text"
              inputMode="numeric"
              value={ongkir}
              onChange={(event) => setOngkir(event.target.value.replace(/[^0-9]/g, ""))}
              className="aoh-squircle-sm min-h-[52px] border border-white/10 bg-white/5 px-4 text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
            />
          </label>
        </section>

        <section className="aoh-squircle aoh-glass aoh-glass-tint p-5">
          <MarginSlider
            value={margin}
            min={settings.marginMin}
            max={settings.marginMax}
            step={settings.marginStep}
            onChange={setMargin}
          />
        </section>

        <section className="aoh-squircle aoh-glass overflow-hidden p-0">
          <OutputRow label="Rate / cm2" value={rate} format={fmtRp} />
          <OutputRow label="Luas matras" value={luas} format={(n) => `${fmtAngka(n)} cm2`} />
          <OutputRow label="Biaya produksi" value={biayaProduksi} format={fmtRp} />
          <OutputRow label="Ongkir" value={ongkirValue} format={fmtRp} />
          <OutputRow label="Modal" value={modal} format={fmtRp} />
          <div className="flex items-baseline justify-between bg-[#d9a75c]/10 px-5 py-4">
            <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[#f0d29c]">Harga jual</span>
            <span className="font-mono text-2xl font-bold text-[#f0d29c]">
              <AnimatedNumber value={hargaJual} format={fmtRp} />
            </span>
          </div>
          <div className="flex items-baseline justify-between px-5 py-3.5">
            <span className="font-mono text-[12px] text-white/50">Profit</span>
            <span className="font-mono text-[15px] text-[#8fbf85]">
              <AnimatedNumber value={profit} format={fmtRp} />
            </span>
          </div>
        </section>

        <section className="aoh-squircle aoh-glass flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/50">Teks penawaran</p>
            {quoteDirty ? (
              <button
                type="button"
                onClick={handleResetQuote}
                className="flex items-center gap-1 font-mono text-[11px] text-[#d9a75c] active:opacity-70"
              >
                <RotateCcw size={12} />
                Reset ke teks otomatis
              </button>
            ) : null}
          </div>
          <textarea
            value={quoteText}
            onChange={(event) => {
              setQuoteText(event.target.value);
              setQuoteDirty(true);
            }}
            rows={11}
            className="aoh-squircle-sm min-h-[240px] w-full resize-y border border-dashed border-white/15 bg-black/20 px-4 py-3.5 font-mono text-[13px] leading-6 text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/50"
          />
          <motion.button
            type="button"
            onClick={handleCopy}
            whileTap={tapAnim}
            transition={spring}
            className={`aoh-squircle-pill flex min-h-[48px] items-center justify-center gap-2 px-5 font-mono text-[13px] font-semibold uppercase tracking-wide transition-colors ${
              copied ? "bg-[#8fbf85] text-[#132015]" : "bg-[#d9a75c] text-[#241a0d]"
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? "Tersalin" : "Salin"}
          </motion.button>
        </section>

        <p className="pb-2 text-center font-mono text-[10px] tracking-[0.08em] text-white/25">
          Alat internal Alfa Omega Hardware &middot; klise kuningan
        </p>
      </div>
    </main>
  );
}

function OutputRow({label, value, format}: {label: string; value: number; format: (n: number) => string}) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3.5 last:border-b-0">
      <span className="font-mono text-[12px] text-white/50">{label}</span>
      <span className="font-mono text-[14px] text-[var(--aoh-ink)]">
        <AnimatedNumber value={value} format={format} />
      </span>
    </div>
  );
}
