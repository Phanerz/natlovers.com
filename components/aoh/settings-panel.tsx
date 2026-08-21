"use client";

import {useState} from "react";
import {AnimatePresence, motion, useReducedMotion} from "framer-motion";
import {Plus, RotateCcw, Trash2} from "lucide-react";
import type {AohSettings, DepthGroup, Jenis} from "@/lib/aoh-pricing";
import {JENIS_ORDER} from "@/lib/aoh-pricing";

export function SettingsPanel({
  open,
  priceData,
  settings,
  onRateChange,
  onToggleRate,
  onAddTebal,
  onRemoveTebal,
  onAddGroup,
  onRemoveGroup,
  onSettingsChange,
  onReset
}: {
  open: boolean;
  priceData: DepthGroup[];
  settings: AohSettings;
  onRateChange: (groupId: string, tebal: number, jenis: Jenis, rate: number) => void;
  onToggleRate: (groupId: string, tebal: number, jenis: Jenis, enable: boolean) => void;
  onAddTebal: (groupId: string, tebalValue: number) => void;
  onRemoveTebal: (groupId: string, tebalValue: number) => void;
  onAddGroup: (label: string) => void;
  onRemoveGroup: (groupId: string) => void;
  onSettingsChange: (settings: AohSettings) => void;
  onReset: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [newTebalByGroup, setNewTebalByGroup] = useState<Record<string, string>>({});
  const [newGroupLabel, setNewGroupLabel] = useState("");

  function submitNewTebal(groupId: string) {
    const raw = (newTebalByGroup[groupId] ?? "").replace(",", ".");
    const value = parseFloat(raw);
    if (Number.isFinite(value) && value > 0) {
      onAddTebal(groupId, value);
      setNewTebalByGroup((prev) => ({...prev, [groupId]: ""}));
    }
  }

  function submitNewGroup() {
    if (newGroupLabel.trim()) {
      onAddGroup(newGroupLabel.trim());
      setNewGroupLabel("");
    }
  }

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
          <div className="aoh-squircle aoh-glass relative mt-4 flex flex-col gap-6 p-5 backdrop-blur-2xl backdrop-saturate-150">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white/80">
                Ubah rate, tambah atau hapus kategori kedalaman dan tebal sesuai kebutuhan. Tersimpan otomatis dan
                tersinkron ke semua perangkat.
              </p>
              <button
                type="button"
                onClick={onReset}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-white/65 active:bg-white/10"
              >
                <RotateCcw size={13} />
                Kembalikan asli
              </button>
            </div>

            {priceData.map((group) => (
              <div key={group.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#e0b477]">
                    Kedalaman {group.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemoveGroup(group.id)}
                    disabled={priceData.length <= 1}
                    aria-label={`Hapus kategori ${group.label}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 transition-colors active:bg-white/10 active:text-[#e29b7c] disabled:opacity-25"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="aoh-squircle-sm overflow-hidden border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-sm">
                      <thead>
                        <tr className="bg-white/[0.05]">
                          <th className="border-b border-white/15 py-2.5 pl-3 pr-3 text-left font-mono text-[10px] uppercase tracking-wide text-white/60">
                            Tebal
                          </th>
                          {JENIS_ORDER.map((jenis) => (
                            <th
                              key={jenis}
                              className="border-b border-l border-white/10 py-2.5 px-3 text-left font-mono text-[10px] uppercase tracking-wide text-white/60"
                            >
                              {jenis}
                            </th>
                          ))}
                          <th className="w-10 border-b border-l border-white/10 py-2.5 pl-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.tebalOptions.map((tebal, rowIndex) => (
                          <tr key={tebal} className={rowIndex % 2 === 1 ? "bg-white/[0.025]" : ""}>
                            <td className="border-b border-white/5 py-2 pl-3 pr-3 font-mono font-medium text-white/85">
                              {tebal} mm
                            </td>
                            {JENIS_ORDER.map((jenis) => {
                              const rate = group.rates[tebal]?.[jenis];
                              if (rate === undefined) {
                                return (
                                  <td key={jenis} className="border-b border-l border-white/5 px-3 py-2">
                                    <button
                                      type="button"
                                      onClick={() => onToggleRate(group.id, tebal, jenis, true)}
                                      aria-label={`Tambahkan ${jenis} untuk ${tebal}mm`}
                                      className="aoh-squircle-xs flex h-9 w-9 items-center justify-center border border-dashed border-white/15 text-white/30 transition-colors active:border-[#d9a75c]/50 active:text-[#e0b477]"
                                    >
                                      <Plus size={13} />
                                    </button>
                                  </td>
                                );
                              }
                              return (
                                <td key={jenis} className="border-b border-l border-white/5 px-3 py-2">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      min={0}
                                      step={50}
                                      value={rate}
                                      onChange={(event) =>
                                        onRateChange(group.id, tebal, jenis, parseFloat(event.target.value) || 0)
                                      }
                                      className="aoh-squircle-xs w-20 border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[14px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => onToggleRate(group.id, tebal, jenis, false)}
                                      aria-label={`Hapus ${jenis} untuk ${tebal}mm`}
                                      className="flex h-6 w-6 shrink-0 items-center justify-center text-white/25 active:text-[#e29b7c]"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </td>
                              );
                            })}
                            <td className="border-b border-l border-white/5 py-2 pl-2">
                              <button
                                type="button"
                                onClick={() => onRemoveTebal(group.id, tebal)}
                                aria-label={`Hapus tebal ${tebal}mm`}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-white/30 active:bg-white/10 active:text-[#e29b7c]"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Tebal baru (mm)"
                    value={newTebalByGroup[group.id] ?? ""}
                    onChange={(event) =>
                      setNewTebalByGroup((prev) => ({...prev, [group.id]: event.target.value}))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") submitNewTebal(group.id);
                    }}
                    className="aoh-squircle-xs w-32 border border-white/10 bg-white/5 px-3 py-2 font-mono text-[13px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                  />
                  <button
                    type="button"
                    onClick={() => submitNewTebal(group.id)}
                    className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-white/65 active:bg-white/10"
                  >
                    <Plus size={13} />
                    Tambah tebal
                  </button>
                </div>
              </div>
            ))}

            <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/55">
                Kategori kedalaman baru
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="mis. Kedalaman 5mm & 6mm"
                  value={newGroupLabel}
                  onChange={(event) => setNewGroupLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") submitNewGroup();
                  }}
                  className="aoh-squircle-xs flex-1 border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
                <button
                  type="button"
                  onClick={submitNewGroup}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-white/65 active:bg-white/10"
                >
                  <Plus size={13} />
                  Tambah kategori
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-white/10 pt-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/65">
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
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/65">
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
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/65">Nama toko</span>
                <input
                  type="text"
                  value={settings.namaToko}
                  onChange={(event) => onSettingsChange({...settings, namaToko: event.target.value})}
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 text-[15px] text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/65">
                  Kalimat pembuka
                </span>
                <textarea
                  value={settings.quoteJudul}
                  onChange={(event) => onSettingsChange({...settings, quoteJudul: event.target.value})}
                  rows={2}
                  className="aoh-squircle-sm border border-white/10 bg-white/5 px-3 py-2.5 text-[15px] leading-6 text-[var(--aoh-ink)] outline-none focus:border-[#d9a75c]/60"
                />
              </label>

              <label className="flex flex-col gap-1.5 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/65">
                  Kalimat penutup
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
