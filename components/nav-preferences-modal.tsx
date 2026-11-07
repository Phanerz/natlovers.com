"use client";

import {useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Check, Globe2, X} from "lucide-react";
import {CurrencyCode, Locale, currencies, currencySymbols, locales} from "@/lib/site";
import {FlagIcon} from "@/components/flag-icon";
import {useDelayedMount} from "@/components/use-delayed-mount";
import {useDialog} from "@/components/consent/use-dialog";

const localeLabels: Record<Locale, string> = {en: "English", id: "Bahasa Indonesia"};
const currencyNames: Record<CurrencyCode, string> = {IDR: "Indonesian rupiah", USD: "US dollars"};

// How long the exit transition runs before the component actually unmounts
//  -  must match the slowest of the panel/backdrop exit durations in globals.css (.pop-*).
const EXIT_MS = 150;

// Language and currency. Ivory paper in light mode, olive in dark mode (the .pop-* tokens), flat
// and with no blur or gradients, so it opens instantly even on a modest phone. Every option is the
// same size, and the chosen one is filled.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Not on the first render: nothing has been saved yet.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSavedPulse(true);
    const timeout = window.setTimeout(() => setSavedPulse(false), 1400);
    return () => window.clearTimeout(timeout);
  }, [locale, currency]);

  useDialog(open && mounted, panelRef, onClose);

  if (!mounted) {
    return null;
  }

  // Portalled to <body> rather than rendered inline: the header this button lives in has a
  // backdrop-filter, which per spec makes it a containing block for position:fixed descendants.
  return createPortal(
    <div
      data-scroll-lock
      onClick={onClose}
      className={`pop-overlay ${entered ? "is-in" : ""} ${!open ? "pointer-events-none" : ""}`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pop-prefs-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`pop-panel ${entered ? "is-in" : ""}`}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="pop-close">
          <X aria-hidden className="h-5 w-5" />
        </button>

        <h2 id="pop-prefs-title" className="pop-title font-display">
          Language &amp; currency
        </h2>

        <div className="pop-grid">
          <section aria-labelledby="pop-lang">
            <p id="pop-lang" className="pop-eyebrow">
              <Globe2 aria-hidden className="h-4 w-4" />
              Language
            </p>
            <div className="pop-options" role="radiogroup" aria-labelledby="pop-lang">
              {locales.map((option) => {
                const active = option === locale;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectLocale(option)}
                    className={`pop-option ${active ? "is-active" : ""}`}
                  >
                    <span className="pop-chip pop-chip--flag">
                      <FlagIcon locale={option} className="pop-flag" />
                    </span>
                    <span className="pop-option__label">{localeLabels[option]}</span>
                    {active ? <Check aria-hidden className="pop-option__check" strokeWidth={2.4} /> : <span className="pop-option__check" aria-hidden />}
                  </button>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="pop-cur">
            <p id="pop-cur" className="pop-eyebrow">
              <span aria-hidden className="pop-eyebrow__sym">
                {currencySymbols[currency].trim()}
              </span>
              Currency
            </p>
            <div className="pop-options" role="radiogroup" aria-labelledby="pop-cur">
              {currencies.map((option) => {
                const active = option === currency;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelectCurrency(option)}
                    className={`pop-option ${active ? "is-active" : ""}`}
                  >
                    <span className="pop-chip">{currencySymbols[option].trim()}</span>
                    <span className="pop-option__label">
                      {option}
                      <span className="pop-option__sub">{currencyNames[option]}</span>
                    </span>
                    {active ? <Check aria-hidden className="pop-option__check" strokeWidth={2.4} /> : <span className="pop-option__check" aria-hidden />}
                  </button>
                );
              })}
            </div>
            <p className="pop-note">
              Every piece has its own fixed price in each currency, set by Natlovers. Nothing is converted at an exchange rate, and you pay exactly the price shown.
            </p>
          </section>
        </div>

        <p className={`pop-saved ${savedPulse ? "is-on" : ""}`} role="status" aria-live="polite">
          {savedPulse ? "Preferences saved" : ""}
        </p>
      </div>
    </div>,
    document.body
  );
}
