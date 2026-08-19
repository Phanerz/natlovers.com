"use client";

import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {RotateCcw} from "lucide-react";
import type {AohSettings, DepthGroup, Jenis} from "@/lib/aoh-pricing";
import {JENIS_ORDER} from "@/lib/aoh-pricing";

export function SettingsPanel({
  open,
  priceData,
  settings,
  onRateChange,
  onSettingsChange,
  onReset
}: {
  open: boolean;
  priceData: DepthGroup[];
  settings: AohSettings;
  onRateChange: (groupId: string, tebal: number, jenis: Jenis, rate: number) => void;
  onSettingsChange: (settings: AohSettings) => void;
  onReset: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={reduceMotion ? {opacity: 0} : {opacity: 0, height: 0}}
          animate={reduceMotion ? {opacity: 1} : {opacity: 1, height: "auto"}}
          exit={reduceMotion ? {opacity: 0} : {opacity: 0, height: 0}}
          transition={reduceMotion ? {duration: 0.15} : {type: "spring", stiffness: 300, damping: 32}}
          className="overflow-hidden"
        >
          <div className="aoh-squircle aoh-glass relative mt-4 flex flex-col gap-6 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white/80">
                Sesuaikan rate per cm&sup2;, ongkir default, dan teks penawaran. Tersimpan otomatis dan tersinkron ke
                semua perangkat.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-white/60 active:bg-white/10"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>

            {priceData.map((group) => (
              <div key={group.id} className="flex flex-col gap-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#e0b477]">{group.label}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border-b border-white/10 py-2 pr-3 text-left font-mono text-[10px] uppercase tracking-wide text-white/55">
                          Tebal
                        </th>
                        {JENIS_ORDER.map((jenis) => (
                          <th
                            key={jenis}
                            className="border-b border-white/10 py-2 px-2 text-left font-mono text-[10px] uppercase tracking-wide text-white/55"
                          >
                            {jenis}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.tebalOptions.map((tebal) => (
                        <tr key={tebal}>
                          <td className="border-b border-white/5 py-2 pr-3 font-mono text-white/80">{tebal} mm</td>
                          {JENIS_ORDER.map((jenis) => {
                            const rate = group.rates[tebal]?.[jenis];
                            if (rate === undefined) {
                              return (
                                <td key={jenis} className="border-b border-white/5 px-2 py-2 text-white/25">
                                  &mdash;
                                </td>
                              );
                            }
                            return (
                              <td key={jenis} className="border-b border-white/5 px-2 py-2">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  step={50}
                                  value={rate}
                                  onChange={(event) =>
                                    onRateChange(group.id, tebal, jenis, parseFloat(event.target.value) || 0)
                                  }
                                  className="aoh-squircle-sm w-24 border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[14px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
                  Ongkir default (Rp)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={settings.ongkirDefault}
                  onChange={(event) =>
                    onSettingsChange({...settings, ongkirDefault: parseFloat(event.target.value) || 0})
                  }
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
                  Margin default (&times;)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={settings.marginMin}
                  max={settings.marginMax}
                  step={settings.marginStep}
                  value={settings.marginDefault}
                  onChange={(event) =>
                    onSettingsChange({...settings, marginDefault: parseFloat(event.target.value) || settings.marginMin})
                  }
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">Nama toko</span>
                <input
                  type="text"
                  value={settings.namaToko}
                  onChange={(event) => onSettingsChange({...settings, namaToko: event.target.value})}
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
                  Judul penawaran
                </span>
                <input
                  type="text"
                  value={settings.quoteJudul}
                  onChange={(event) => onSettingsChange({...settings, quoteJudul: event.target.value})}
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
                  Catatan penutup
                </span>
                <textarea
                  value={settings.quotePenutup}
                  onChange={(event) => onSettingsChange({...settings, quotePenutup: event.target.value})}
                  rows={3}
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 text-[15px] leading-6 text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
