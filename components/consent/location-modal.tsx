"use client";

import {useEffect, useId, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {MapPin, X} from "lucide-react";
import {CountrySelector} from "@/components/consent/country-selector";
import {CurrencySelector} from "@/components/consent/currency-selector";
import {useDialog} from "@/components/consent/use-dialog";
import {countryName} from "@/lib/countries";
import {recommendedCurrency} from "@/lib/consent";
import type {CurrencyCode} from "@/lib/site";

// "Where are you?": the visitor confirms their country and the currency prices are shown in. The
// country we detected is suggested, never forced. This is about prices only: where an order is
// delivered is asked for separately at checkout.
export function LocationModal({
  open,
  detected,
  initial,
  onSave,
  onClose
}: {
  open: boolean;
  detected: string | null;
  // What the visitor chose before, when they are changing it.
  initial: {country: string; currency: CurrencyCode} | null;
  onSave: (country: string, currency: CurrencyCode, manual: boolean) => void;
  onClose: () => void;
}) {
  const [country, setCountry] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => setMounted(true), []);

  // Every time the dialog opens, start from what the visitor had, or from what we detected.
  useEffect(() => {
    if (!open) return;
    const startCountry = initial?.country ?? detected;
    setCountry(startCountry);
    setCurrency(initial?.currency ?? recommendedCurrency(startCountry));
    setCurrencyTouched(Boolean(initial && initial.currency !== recommendedCurrency(initial.country)));
    // Only when it opens: later changes to `detected` must not undo what the visitor is doing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useDialog(open, dialogRef, onClose);

  if (!open || !mounted) return null;

  const recommended = country ? recommendedCurrency(country) : null;

  function pickCountry(code: string) {
    setCountry(code);
    // Choosing a country sets the currency that suits it, unless the visitor already chose one by hand.
    if (!currencyTouched) setCurrency(recommendedCurrency(code));
  }

  function save() {
    if (!country) return;
    // "Manual" means the visitor chose something other than what we would have picked for them.
    const manual = detected === null || country !== detected || currency !== recommendedCurrency(country);
    onSave(country, currency, manual);
  }

  return createPortal(
    <div className="nlc-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} tabIndex={-1} className="nlc-dialog">
        <button type="button" className="nlc-close" onClick={onClose} aria-label="Close">
          <X aria-hidden className="h-5 w-5" />
        </button>
        <span className="nlc-icon" aria-hidden>
          <MapPin className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <h2 id={titleId} className="nlc-title font-display">
          Where are you?
        </h2>
        <p id={descId} className="nlc-text">
          {detected ? `We think you are in ${countryName(detected)}. ` : null}
          Choose your country and we will show prices in the right currency. You can change this any time from the footer.
        </p>

        <CountrySelector value={country} detected={detected} onChange={pickCountry} />
        <CurrencySelector
          value={currency}
          recommended={recommended}
          onChange={(next) => {
            setCurrency(next);
            setCurrencyTouched(true);
          }}
        />

        <button type="button" className="nlc-primary nlc-primary--wide" disabled={!country} onClick={save}>
          Continue
        </button>
        <p className="nlc-fine">Delivery country is asked for separately when you check out.</p>
      </div>
    </div>,
    document.body
  );
}
