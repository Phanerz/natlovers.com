"use client";

import {useId} from "react";
import type {CurrencyCode} from "@/lib/site";

const OPTIONS: {code: CurrencyCode; label: string; symbol: string}[] = [
  {code: "IDR", label: "Indonesian rupiah", symbol: "Rp"},
  {code: "USD", label: "US dollars", symbol: "$"}
];

// The two currencies prices exist in. The one that suits the chosen country is marked, but either
// can be picked.
export function CurrencySelector({
  value,
  recommended,
  onChange
}: {
  value: CurrencyCode;
  recommended: CurrencyCode | null;
  onChange: (currency: CurrencyCode) => void;
}) {
  const name = useId();
  return (
    <fieldset className="nlc-field">
      <legend className="nlc-label">Currency</legend>
      <div className="nlc-currencies">
        {OPTIONS.map((option) => (
          <label key={option.code} className="nlc-currency">
            <input type="radio" name={name} value={option.code} checked={value === option.code} onChange={() => onChange(option.code)} className="nlc-sr" />
            <span className="nlc-currency__face">
              <span className="nlc-currency__code">
                {option.code} <span aria-hidden>{option.symbol}</span>
              </span>
              <span className="nlc-currency__name">{option.label}</span>
              {recommended === option.code ? <span className="nlc-currency__tag">Recommended</span> : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
