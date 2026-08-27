"use client";

import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Globe2, X} from "lucide-react";
import {CurrencyCode, Locale, currencies, currencySymbols, locales} from "@/lib/site";
import {FlagIcon} from "@/components/flag-icon";
import {useDelayedMount} from "@/components/use-delayed-mount";

function Sprig() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-9 w-9 shrink-0 text-[#a9b79c]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M32 58 C30 44 34 30 30 14" />
      <path d="M30 14 C24 16 18 14 14 8" />
      <path d="M30 14 C36 12 40 6 40 2" />
      <path d="M31 30 C25 30 20 26 18 22" />
      <path d="M31 30 C37 28 41 24 42 20" />
      <path d="M31 44 C26 45 22 42 20 38" />
      <path d="M31 44 C36 43 40 40 41 36" />
    </svg>
  );
}

const localeLabels: Record<Locale, string> = {en: "English", id: "Bahasa Indonesia"};

// How long the exit transition runs before the component actually unmounts
//  -  must match the slowest of the panel/backdrop exit durations below.
const EXIT_MS = 150;

export function NavPreferencesModal({
  open,
  locale,
  currency,
  onSelectLocale,
  onSelectCurrency,
  onClose
}: {
  open: boolean;
  locale: Locale;
  currency: CurrencyCode;
  onSelectLocale: (value: Locale) => void;
  onSelectCurrency: (value: CurrencyCode) => void;
  onClose: () => void;
}) {
  const [savedPulse, setSavedPulse] = useState(false);
  const {mounted, entered} = useDelayedMount(open, EXIT_MS);

  useEffect(() => {
    setSavedPulse(true);
    const timeout = window.setTimeout(() => setSavedPulse(false), 900);
    return () => window.clearTimeout(timeout);
  }, [locale, currency]);

  if (!mounted) {
    return null;
  }

  // Portalled to <body> rather than rendered inline: the header this button
  // lives in has backdrop-blur (a backdrop-filter), which per spec makes it
  // a containing block for position:fixed descendants  -  without the
  // portal, "fixed inset-0" here would resolve against the header's own
  // ~92px box instead of the viewport.
  return createPortal(
    <div
      data-scroll-lock
      onClick={onClose}
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/30 px-4 py-16 backdrop-blur-md transition-opacity duration-150 ${
        entered ? "opacity-100" : "opacity-0"
      } ${!open ? "pointer-events-none" : ""}`}
    >
      <div className="mx-auto flex min-h-full max-w-2xl items-center">
        <div
          onClick={(event) => event.stopPropagation()}
          className={`menu-surface w-full max-w-2xl overflow-hidden rounded-xl border border-[#e4d9c1] bg-[rgba(250,246,236,0.98)] shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all ${
            entered
              ? "translate-y-0 scale-100 opacity-100 duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              : `translate-y-4 scale-[0.88] opacity-0 ease-out ${open ? "duration-200" : "duration-150"}`
          }`}
        >
          <div className="flex items-center justify-end px-5 pt-5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="glass-icon-btn rounded-full p-2 text-forest-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-8 px-6 pb-8 pt-2 sm:grid-cols-[1fr_auto_1fr] sm:px-10">
            <div>
              <div className="flex flex-col items-center gap-2 pb-5 text-center sm:items-start sm:text-left">
                <Globe2 className="h-5 w-5 text-forest-600" />
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-forest-500">Language</p>
              </div>
              <div className="space-y-2">
                {locales.map((option) => {
                  const active = option === locale;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onSelectLocale(option)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${
                        active ? "glass-btn-primary text-sand-50" : "glass-btn-secondary text-forest-800"
                      }`}
                    >
                      <FlagIcon locale={option} className="h-6 w-9 shrink-0 rounded-[3px]" />
                      <span className="flex-1 text-sm font-medium">{localeLabels[option]}</span>
                      {active ? <CheckIcon /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden items-center justify-center sm:flex">
              <div className="h-full w-px bg-[#e4d9c1]" />
            </div>
            <div className="flex justify-center sm:hidden">
              <Sprig />
            </div>

            <div>
              <div className="flex flex-col items-center gap-2 pb-5 text-center sm:items-start sm:text-left">
                <span className="text-lg leading-none text-forest-600">{currencySymbols[currency].trim()}</span>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-forest-500">Currency</p>
              </div>
              <div className="space-y-2">
                {currencies.map((option) => {
                  const active = option === currency;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onSelectCurrency(option)}
                      className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${
                        active ? "glass-btn-primary text-sand-50" : "glass-btn-secondary text-forest-800"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          active ? "bg-white/15 text-sand-50" : "bg-[#eee4cd] text-forest-800"
                        }`}
                      >
                        {currencySymbols[option].trim()}
                      </span>
                      <span className="flex-1 text-sm font-medium">{option}</span>
                      {active ? <CheckIcon /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className={`flex items-center justify-center gap-2 border-t border-[#e4d9c1] py-4 text-sm text-forest-600 transition-opacity duration-300 ${
              savedPulse ? "opacity-100" : "opacity-60"
            }`}
          >
            <Sprig />
            <span>Preferences saved</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
      <path d="M4 10.5l3.5 3.5L16 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
