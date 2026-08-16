"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect, useState} from "react";
import {AlertCircle, ArrowRight, CheckCircle2, Loader2, PlayCircle, X} from "lucide-react";
import type {CurrencyCode} from "@/lib/site";
import {formatCurrency} from "@/lib/format";
import {summariseConfig, type CustomConfig, type CustomProductType} from "@/lib/custom-studio";
import {ESTIMATE_DISCLAIMER, modifiersAreUnconfigured, type Estimate} from "@/lib/custom-pricing";
import {describePreviewMatch, type PreviewMatch} from "@/lib/custom-preview";
import type {CustomRequestImageView, CustomRequestView} from "@/lib/custom-requests";

// Explains the process before anything is filled in, and is explicit that
// the estimate is not the price — the single most important thing for a
// customer to understand before they spend ten minutes configuring.
export function HowItWorks() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const steps = [
    {title: "Design", body: "Choose the shape, material, and details you'd like. Nothing is committed yet."},
    {title: "Share your inspiration", body: "Upload photos and tell us anything that matters about the piece."},
    {title: "Send the request", body: "It arrives with the studio in Yogyakarta and someone reviews it personally."},
    {title: "Confirmation", body: "The studio confirms the final design and the actual price with you."},
    {title: "Production", body: "Once you approve, the piece is made by hand. This takes time, and that's the point."}
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="button-lift flex items-center gap-2 rounded-full border border-[#ddd5c4] bg-[#fffdf9] px-4 py-2.5 text-[12px] font-medium text-forest-800"
      >
        <PlayCircle className="h-4 w-4 text-forest-600" />
        How it works
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="How the Custom Studio works"
            className="absolute right-0 top-[calc(100%+10px)] z-[61] w-[min(22rem,calc(100vw-2rem))] rounded-[1.4rem] border border-[#e0d8c7] bg-[#fffdf9] p-5 shadow-[0_28px_70px_rgba(23,32,21,0.18)]"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="font-display text-lg leading-tight text-forest-900">How a commission works</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-forest-400 hover:text-forest-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-2.5">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[10px] font-semibold text-forest-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-forest-900">{step.title}</p>
                    <p className="text-[11px] leading-relaxed text-forest-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-4 rounded-xl border border-[#e4dcc9] bg-[#faf6ec] px-3 py-2.5 text-[11px] leading-relaxed text-forest-600">
              <strong className="font-semibold text-forest-800">About the estimate:</strong> {ESTIMATE_DISCLAIMER}
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}

// Live estimate, shown wherever a price appears. Renders the honest state
// when there is nothing real to price against, rather than a placeholder
// number.
export function EstimatePanel({
  estimate,
  currency,
  compact = false
}: {
  estimate: Estimate | null;
  currency: CurrencyCode;
  compact?: boolean;
}) {
  if (!estimate) {
    return (
      <div className={compact ? "" : "rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-3.5 py-3"}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">Estimated total</p>
        <p className={`mt-0.5 font-display text-forest-900 ${compact ? "text-base leading-none" : "text-lg"}`}>
          Quoted after studio review
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-forest-500">
          {compact
            ? "No comparable catalogue pricing for this type yet."
            : "We don’t have comparable catalogue pricing for this type yet, so the studio will quote your piece directly."}
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-3.5 py-3"}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">Estimated total</p>
      <p className={`mt-0.5 font-display leading-none text-forest-900 ${compact ? "text-xl" : "text-2xl"}`}>
        {formatCurrency(estimate.totalIdr, currency)}
      </p>
      {modifiersAreUnconfigured(estimate) ? (
        // Said plainly rather than letting a customer infer that every
        // option happens to be free of charge.
        <p className="mt-1 text-[10px] leading-relaxed text-forest-500">
          {compact
            ? "Estimate only — option surcharges aren’t set yet."
            : "Based on comparable pieces in our catalogue. Option surcharges aren’t reflected yet — the studio confirms the real figure."}
        </p>
      ) : (
        <p className="mt-1 text-[10px] leading-relaxed text-forest-500">
          {compact ? "Estimate only — the studio confirms the final price." : ESTIMATE_DISCLAIMER}
        </p>
      )}
    </div>
  );
}

export function ReviewPanel({
  config,
  notes,
  images,
  estimate,
  currency,
  match,
  noun,
  submitting,
  error,
  onClose,
  onSubmit
}: {
  config: CustomConfig;
  notes: string;
  images: CustomRequestImageView[];
  estimate: Estimate | null;
  currency: CurrencyCode;
  match: PreviewMatch;
  noun: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, submitting]);

  const rows = summariseConfig(config);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Review your custom request"
      className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-forest-900/70 p-4 backdrop-blur-sm sm:p-8"
    >
      <div className="my-auto w-full max-w-2xl rounded-[1.8rem] border border-[#e0d8c7] bg-[#fffdf9] p-6 shadow-[0_40px_90px_rgba(23,32,21,0.28)] sm:p-8">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-forest-500">Review your request</p>
            <h2 className="mt-1 font-display text-2xl leading-tight text-forest-900">
              One last look before it reaches the studio
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="mt-1 text-forest-400 transition-colors hover:text-forest-700 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">Your design</p>
            <dl className="divide-y divide-[#eee7d8] rounded-2xl border border-[#e4dcc9] bg-white/70">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <dt className="text-[12px] text-forest-500">{row.label}</dt>
                  <dd className="text-right text-[13px] font-medium text-forest-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* The preview's honesty carries through to the review step, so a
              customer confirms knowing exactly what the picture did and did
              not represent. */}
          <p className="rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-4 py-3 text-[11px] leading-relaxed text-forest-600">
            {describePreviewMatch(match, noun)}
          </p>

          {images.length ? (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">
                Your inspiration ({images.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {images.map((image) => (
                  <div key={image.id} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#d9ccb3]">
                    <Image src={image.url} alt="Inspiration" fill sizes="64px" className="object-cover" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {notes.trim() ? (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">Your notes</p>
              <p className="whitespace-pre-wrap rounded-2xl border border-[#e4dcc9] bg-white/70 px-4 py-3 text-[13px] leading-relaxed text-forest-800">
                {notes}
              </p>
            </section>
          ) : null}

          <EstimatePanel estimate={estimate} currency={currency} />

          {error ? (
            <p className="flex items-start gap-2 rounded-2xl border border-[#e6c4b6] bg-[#fdf1ec] px-4 py-3 text-[12px] leading-relaxed text-[#a4553c]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="button-lift flex flex-1 items-center justify-center gap-2 rounded-full bg-forest-900 px-6 py-3.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? "Sending..." : "Submit custom request"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-[#ddd5c4] px-6 py-3.5 text-sm font-medium text-forest-700 disabled:opacity-50 sm:flex-none"
          >
            Keep editing
          </button>
        </div>
      </div>
    </div>
  );
}

export function SuccessState({
  request,
  productType,
  currency
}: {
  request: CustomRequestView;
  productType: CustomProductType;
  currency: CurrencyCode;
}) {
  const steps = [
    {title: "Studio review", body: "Someone in Yogyakarta reads your request and your photos."},
    {title: "Final confirmation", body: "We confirm the design and the actual price with you."},
    {title: "Production begins", body: "Once you approve, your piece is made by hand."}
  ];

  return (
    <div className="shell py-16">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[2rem] border border-[#e0d8c7] bg-[#fffdf9] p-8 text-center shadow-card sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100">
            <CheckCircle2 className="h-7 w-7 text-forest-700" />
          </span>
          <h1 className="mt-5 font-display text-3xl leading-tight text-forest-900">Your request is with the studio</h1>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-forest-600">
            Thank you. We&apos;ve sent a copy to your email, and someone will look at this personally.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-500">Reference</p>
              <p className="mt-1 font-display text-lg text-forest-900">{request.requestRef}</p>
            </div>
            <div className="rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-500">Piece</p>
              <p className="mt-1 font-display text-lg text-forest-900">{productType}</p>
            </div>
            <div className="rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-forest-500">Estimated</p>
              <p className="mt-1 font-display text-lg text-forest-900">
                {request.estimatedPriceIdr > 0 ? formatCurrency(request.estimatedPriceIdr, currency) : "To be quoted"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-forest-500">{ESTIMATE_DISCLAIMER}</p>

          <div className="mt-8 text-left">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-forest-500">What happens next</p>
            <ol className="space-y-3">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[11px] font-semibold text-forest-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-forest-900">{step.title}</p>
                    <p className="text-[12px] leading-relaxed text-forest-600">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <Link
              href="/account?tab=custom"
              className="button-lift flex items-center justify-center gap-2 rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-sand-50"
            >
              View my requests
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/catalogue"
              className="rounded-full border border-[#ddd5c4] px-6 py-3 text-sm font-medium text-forest-700"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
