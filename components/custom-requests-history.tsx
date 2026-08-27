"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect, useState} from "react";
import {ArrowRight} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import type {CurrencyCode} from "@/lib/site";
import {customerFacingStatusLabels, customRequestStatusStyle, summariseConfig} from "@/lib/custom-studio";
import {ESTIMATE_DISCLAIMER} from "@/lib/custom-pricing";
import type {CustomRequestView} from "@/lib/custom-requests";

// The customer's own view of their commissions. It uses
// customerFacingStatusLabels rather than the studio's internal ones  - 
// "under review" and "needs customer input" are distinct jobs inside the
// workshop but read as one thing from outside, and a customer should not
// have to learn the studio's internal vocabulary to understand where their
// piece is.
export function CustomRequestsHistory({currency}: {currency: CurrencyCode}) {
  const [requests, setRequests] = useState<CustomRequestView[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/custom-request/history", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : {requests: []}))
      .then((data: {requests: CustomRequestView[]}) => {
        if (!cancelled) {
          setRequests(Array.isArray(data.requests) ? data.requests : []);
        }
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (requests === null) {
    return <p className="py-16 text-center text-sm text-forest-500">Loading...</p>;
  }

  if (!requests.length) {
    return (
      <div className="space-y-4">
        <h2 className="font-display text-2xl text-forest-900">Custom requests</h2>
        <div className="rounded-xl border border-[#e4d9c1] bg-white/70 p-8 text-center">
          <p className="text-sm leading-relaxed text-forest-600">
            You haven&apos;t commissioned anything yet. The Custom Studio is where you design a piece and we handcraft it.
          </p>
          <Link
            href="/custom"
            className="button-lift mt-5 inline-flex items-center gap-2 rounded-full bg-forest-900 px-5 py-2.5 text-sm font-semibold text-sand-50"
          >
            Open the Custom Studio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl text-forest-900">Custom requests</h2>

      {requests.map((request) => {
        const style = customRequestStatusStyle[request.status];
        const rows = summariseConfig(request.configuration);
        // Once the studio has quoted, that is the number that matters  -  the
        // original estimate stops being the headline figure.
        const quoted = request.finalPriceIdr !== null;

        return (
          <div key={request.id} className="rounded-xl border border-[#e4d9c1] bg-white/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-lg text-forest-900">{request.requestRef}</p>
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em]"
                style={{backgroundColor: style.bg, borderColor: style.border, color: style.text}}
              >
                {customerFacingStatusLabels[request.status]}
              </span>
            </div>
            <p className="mt-1 text-xs text-forest-500">
              {request.productType} ·{" "}
              {request.submittedAt
                ? new Date(request.submittedAt).toLocaleDateString(undefined, {dateStyle: "medium"})
                : ""}
            </p>

            <div className="mt-3 space-y-1.5 border-t border-[#e4d9c1] pt-3">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="text-forest-500">{row.label}</span>
                  <span className="text-right text-forest-800">{row.value}</span>
                </div>
              ))}
            </div>

            {request.images.length ? (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#e4d9c1] pt-3">
                {request.images.map((image) => (
                  <div key={image.id} className="relative h-14 w-14 overflow-hidden rounded-xl border border-[#e4d9c1]">
                    <Image src={image.url} alt="Inspiration" fill sizes="56px" className="object-cover" />
                  </div>
                ))}
              </div>
            ) : null}

            {request.notes?.trim() ? (
              <p className="mt-3 whitespace-pre-wrap border-t border-[#e4d9c1] pt-3 text-sm leading-relaxed text-forest-700">
                {request.notes}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-between border-t border-[#e4d9c1] pt-3 text-sm font-semibold text-forest-900">
              <span>{quoted ? "Quoted price" : "Estimated total"}</span>
              <span>
                {quoted
                  ? formatCurrency(request.finalPriceIdr!, currency)
                  : request.estimatedPriceIdr > 0
                    ? formatCurrency(request.estimatedPriceIdr, currency)
                    : "To be quoted"}
              </span>
            </div>

            {!quoted ? <p className="mt-1.5 text-[11px] leading-relaxed text-forest-500">{ESTIMATE_DISCLAIMER}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
