"use client";

import {useEffect, useState} from "react";
import {Loader2} from "lucide-react";
import {CustomStudio} from "@/components/custom-studio/studio";
import {PausedNotice} from "@/components/custom-studio/paused-notice";
import {emptyPricingBasis, type PricingBasis} from "@/lib/custom-pricing";
import {emptyPreviewCatalogue, type PreviewCatalogue} from "@/lib/custom-preview";
import type {CustomRequestView} from "@/lib/custom-requests";

// The homepage's Custom section. It renders the real Custom Studio — the
// same component /custom renders — rather than a teaser that sends people
// somewhere else to do the actual work.
//
// It fetches its own data because the homepage is a client component, so it
// cannot read pricing and catalogue data during render the way the
// standalone route does. Everything comes from /api/custom-request/studio,
// which calls the identical server functions.

type Bootstrap = {
  basis: PricingBasis;
  catalogue: PreviewCatalogue;
  draft: CustomRequestView | null;
  signedIn: boolean;
  paused: boolean;
  pausedMessage: string;
};

export function CustomStudioSection() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/custom-request/studio", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bootstrap failed"))))
      .then((payload: Bootstrap) => {
        if (!cancelled) setData(payload);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed) {
    // The studio genuinely cannot be used without its catalogue and pricing
    // data, so this says so rather than rendering an empty shell that looks
    // interactive but would price and preview nothing.
    return (
      <div className="shell flex min-h-[24rem] flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-500">Custom Studio</p>
        <p className="max-w-md text-sm leading-relaxed text-forest-600">
          The studio couldn&apos;t load just now. Refresh the page, or open it directly at{" "}
          <a href="/custom" className="underline underline-offset-2">
            /custom
          </a>
          .
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="shell flex min-h-[24rem] items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-forest-400" />
      </div>
    );
  }

  if (data.paused) {
    return <PausedNotice message={data.pausedMessage} />;
  }

  return (
    <CustomStudio
      basis={data.basis ?? emptyPricingBasis}
      catalogue={data.catalogue ?? emptyPreviewCatalogue}
      initialDraft={data.draft}
      signedIn={data.signedIn}
    />
  );
}
