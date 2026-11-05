"use client";

import {useRef, useState} from "react";
import {Minus, Plus, X} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {colourSwatchStyle} from "@/lib/colour-library";
import {formatCurrency} from "@/lib/format";
import {extraAmount, lineExtrasTotal, unitPrice, type Priced} from "@/lib/pricing";
import {
  defaultItem,
  resolveOptions,
  type OptionAnswer,
  type OptionAnswers,
  type OptionField,
  type ProductOptions,
  type SubField
} from "@/lib/product-options";

type SubChoiceField = Extract<SubField, {kind: "colour" | "choice"}>;

function ColourPick({
  field,
  value,
  onChange
}: {
  field: Extract<SubChoiceField, {kind: "colour"}>;
  value: string | undefined;
  onChange: (label: string) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {field.options.map((option) => (
        <button
          type="button"
          key={option.label}
          title={option.label}
          aria-label={option.label}
          aria-pressed={value === option.label}
          onClick={() => onChange(option.label)}
          className="pdp-swatch"
        >
          <span className="pdp-swatch-dot" style={colourSwatchStyle(option)} />
        </button>
      ))}
    </div>
  );
}

function ChoicePick({
  field,
  value,
  onChange,
  money
}: {
  field: Extract<SubChoiceField, {kind: "choice"}>;
  value: string | undefined;
  onChange: (label: string) => void;
  money: (amount: number) => string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {field.options.map((option) => (
        <button
          type="button"
          key={option.label}
          aria-pressed={value === option.label}
          onClick={() => onChange(option.label)}
          className="pdp-chip"
        >
          {option.label}
          {option.priceIdr > 0 ? <span className="pdp-chip-price">+{money(option.priceIdr)}</span> : null}
        </button>
      ))}
    </div>
  );
}

// One question inside a field or inside a single add-on copy.
function SubQuestion({
  field,
  value,
  onChange,
  money
}: {
  field: SubField;
  value: string | undefined;
  onChange: (next: string) => void;
  money: (amount: number) => string;
}) {
  const chosen = field.kind === "text" ? null : (value ?? field.options[0].label);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="pdp-option-title">{field.label}</p>
        {chosen ? <p className="pdp-option-value">{chosen}</p> : null}
      </div>
      {field.kind === "colour" ? <ColourPick field={field} value={chosen ?? undefined} onChange={onChange} /> : null}
      {field.kind === "choice" ? <ChoicePick field={field} value={chosen ?? undefined} onChange={onChange} money={money} /> : null}
      {field.kind === "text" ? (
        <input
          value={value ?? ""}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder || "Type here…"}
          className="pdp-input pdp-input-line mt-2"
        />
      ) : null}
    </div>
  );
}

function ReferencePhotos({
  field,
  answer,
  onChange
}: {
  field: Extract<OptionField, {kind: "image"}>;
  answer: OptionAnswer;
  onChange: (next: OptionAnswer) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urls = answer.urls ?? [];

  async function upload(files: FileList | null) {
    if (!files?.length) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      Array.from(files)
        .slice(0, field.maxFiles - urls.length)
        .forEach((file) => body.append("files", file));
      const response = await fetch("/api/product-options/upload", {method: "POST", body});
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error ?? "Could not upload your photos.");
        return;
      }
      onChange({...answer, urls: [...urls, ...(payload.urls as string[])].slice(0, field.maxFiles)});
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div>
      <p className="pdp-option-title">{field.label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {urls.map((url) => (
          <div key={url} className="pdp-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Your reference" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange({...answer, urls: urls.filter((u) => u !== url)})}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {urls.length < field.maxFiles ? (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="pdp-photo-add">
            <Plus className="h-4 w-4" />
            {busy ? "Uploading…" : "Add a photo"}
          </button>
        ) : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(event) => void upload(event.target.files)}
        />
      </div>
      {error ? <p className="pdp-fineprint" role="alert">{error}</p> : null}
      <p className="pdp-fineprint">Up to {field.maxFiles} photos. Pictures of the pet, a colour you love, anything that helps us.</p>
    </div>
  );
}

function AddonField({
  field,
  answer,
  onChange,
  money
}: {
  field: Extract<OptionField, {kind: "addon"}>;
  answer: OptionAnswer;
  onChange: (next: OptionAnswer) => void;
  money: (amount: number) => string;
}) {
  const count = answer.count ?? field.includedCount;
  const items = answer.items ?? [];

  function setCount(next: number) {
    const bounded = Math.min(field.maxCount, Math.max(field.minCount, next));
    const grown = Array.from({length: bounded}, (_, index) => items[index] ?? defaultItem(field.fields));
    onChange({...answer, count: bounded, items: grown});
  }

  function setItem(index: number, subId: string, value: string) {
    onChange({
      ...answer,
      count,
      items: Array.from({length: count}, (_, i) => (i === index ? {...(items[i] ?? defaultItem(field.fields)), [subId]: value} : (items[i] ?? defaultItem(field.fields))))
    });
  }

  const noun = field.itemLabel.charAt(0).toUpperCase() + field.itemLabel.slice(1);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="pdp-option-title">{field.label}</p>
          <p className="pdp-option-value">
            {field.unitPriceIdr > 0
              ? `${money(field.unitPriceIdr)} for each ${field.itemLabel}${field.includedCount > 0 ? ` beyond ${field.includedCount}` : ""}`
              : "No extra charge"}
          </p>
        </div>
        <div className="pdp-stepper" role="group" aria-label={`Number of ${field.label}`}>
          <button type="button" onClick={() => setCount(count - 1)} disabled={count <= field.minCount} aria-label={`Fewer ${field.label}`}>
            <Minus className="h-4 w-4" />
          </button>
          <output aria-live="polite">{count}</output>
          <button type="button" onClick={() => setCount(count + 1)} disabled={count >= field.maxCount} aria-label={`More ${field.label}`}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {count > 0 && field.fields.length ? (
        <div className="mt-4 space-y-4">
          {Array.from({length: count}, (_, index) => {
            const item = items[index] ?? defaultItem(field.fields);
            return (
              <div key={index} className="pdp-item">
                <p className="pdp-item-title">
                  {noun} {index + 1}
                  {index >= field.includedCount && field.unitPriceIdr > 0 ? <span>+{money(field.unitPriceIdr)}</span> : null}
                </p>
                <div className="space-y-4">
                  {field.fields.map((sub) => (
                    <SubQuestion key={sub.id} field={sub} value={item[sub.id]} onChange={(value) => setItem(index, sub.id, value)} money={money} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// The customer's side of lib/product-options.ts: the same paper note, filled
// in field by field, with a receipt at the foot that adds up as they choose.
export function CustomOptionsNote({
  options,
  answers,
  onChange,
  product
}: {
  options: ProductOptions;
  answers: OptionAnswers;
  onChange: (next: OptionAnswers) => void;
  // The piece itself, for its fixed price in each currency.
  product: Priced;
}) {
  const {currency} = useSitePreferences();
  // Option prices are set in rupiah; here they are shown in the chosen currency, in step with this piece's own price.
  const money = (amountIdr: number) => formatCurrency(extraAmount(product, amountIdr, currency), currency);
  const resolved = resolveOptions(options, answers);
  const priced = resolved.lines.filter((line) => line.extraIdr > 0);

  function setAnswer(id: string, next: OptionAnswer) {
    onChange({...answers, [id]: next});
  }

  return (
    <section id="customise" className="pdp-customise" aria-labelledby="customise-title">
      <p className="pdp-note-eyebrow">
        <span>Natlovers</span>
        <span aria-hidden>·</span>
        <span>Order note</span>
      </p>
      <h2 id="customise-title" className="pdp-note-title">
        Make it yours
      </h2>
      <p className="pdp-customise-lede">Set each part of your piece below. Anything with a price is added to your total at the bottom.</p>
      <div className="pdp-note-rule" aria-hidden />

      <div className="mt-6 space-y-8">
        {options.fields.map((field) => {
          const answer = answers[field.id] ?? {};
          if (field.kind === "colour" || field.kind === "choice" || field.kind === "text") {
            return (
              <SubQuestion
                key={field.id}
                field={field}
                value={answer.v}
                onChange={(value) => setAnswer(field.id, {...answer, v: value})}
                money={money}
              />
            );
          }
          if (field.kind === "image") {
            return <ReferencePhotos key={field.id} field={field} answer={answer} onChange={(next) => setAnswer(field.id, next)} />;
          }
          return <AddonField key={field.id} field={field} answer={answer} onChange={(next) => setAnswer(field.id, next)} money={money} />;
        })}
      </div>

      <div className="pdp-note-rule mt-8" aria-hidden />
      <dl className="pdp-receipt" aria-label="Price of your selection">
        <div>
          <dt>The piece, as pictured</dt>
          <dd>{formatCurrency(unitPrice(product, currency), currency)}</dd>
        </div>
        {priced.map((line, index) => (
          <div key={`${line.label}-${index}`}>
            <dt>{line.label}</dt>
            <dd>+{money(line.extraIdr)}</dd>
          </div>
        ))}
        <div className="pdp-receipt-total">
          <dt>Your total</dt>
          <dd>{formatCurrency(unitPrice(product, currency) + lineExtrasTotal(product, resolved.lines, currency), currency)}</dd>
        </div>
      </dl>
      <p className="pdp-note-sign">Made by hand, just for you</p>
    </section>
  );
}
