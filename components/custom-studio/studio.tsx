"use client";

import Link from "next/link";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ArrowRight, Check, Heart, Leaf, Lock, RotateCcw} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {ConfigPanel} from "@/components/custom-studio/config-panel";
import {PreviewPanel} from "@/components/custom-studio/preview-panel";
import {InspirationPanel} from "@/components/custom-studio/inspiration-panel";
import {EstimatePanel, HowItWorks, ReviewPanel, SuccessState} from "@/components/custom-studio/review-panel";
import {calculateEstimate, type PricingBasis} from "@/lib/custom-pricing";
import {findPreviewMatch, type PreviewCatalogue} from "@/lib/custom-preview";
import {
  customProductTypes,
  customTypeNoun,
  customTypeTabLabel,
  defaultConfigFor,
  type CustomConfig,
  type CustomProductType
} from "@/lib/custom-studio";
import type {CustomRequestImageView, CustomRequestView} from "@/lib/custom-requests";

// Local mirror of the server draft. Authenticated customers get their draft
// back from the database; everyone else still gets their work back from
// this, so someone who designed a bag before signing in doesn't lose it at
// the sign-in redirect.
const LOCAL_DRAFT_KEY = "natlovers-custom-draft";

type LocalDraft = {productType: CustomProductType; config: CustomConfig; notes: string};

type StepKey = "design" | "inspiration" | "details" | "review";

const steps: {key: StepKey; label: string; hint: string}[] = [
  {key: "design", label: "Design", hint: "Make it yours"},
  {key: "inspiration", label: "Inspiration", hint: "Add your ideas"},
  {key: "details", label: "Details", hint: "Tell us more"},
  {key: "review", label: "Review", hint: "Submit request"}
];

export function CustomStudio({
  basis,
  catalogue,
  initialDraft,
  signedIn
}: {
  basis: PricingBasis;
  catalogue: PreviewCatalogue;
  initialDraft: CustomRequestView | null;
  signedIn: boolean;
}) {
  const {currency} = useSitePreferences();

  const [config, setConfig] = useState<CustomConfig>(initialDraft?.configuration ?? defaultConfigFor("Bags"));
  const [notes, setNotes] = useState(initialDraft?.notes ?? "");
  const [images, setImages] = useState<CustomRequestImageView[]>(initialDraft?.images ?? []);
  const [requestId, setRequestId] = useState<string | null>(initialDraft?.id ?? null);

  const [restoredNotice, setRestoredNotice] = useState(Boolean(initialDraft));
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<CustomRequestView | null>(null);

  // "Touched" is what the progress indicator reads, so a step lights up
  // because the customer actually did something — not because a default
  // value happens to be present.
  const [designTouched, setDesignTouched] = useState(Boolean(initialDraft));
  const [notesTouched, setNotesTouched] = useState(Boolean(initialDraft?.notes));

  const designRef = useRef<HTMLDivElement>(null);
  const inspirationRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  const estimate = useMemo(() => calculateEstimate(config, basis), [config, basis]);
  const match = useMemo(() => findPreviewMatch(config, catalogue), [config, catalogue]);
  const noun = customTypeNoun[config.productType];

  // ---------------------------------------------------------------------
  // Draft restore + persistence
  // ---------------------------------------------------------------------

  // Local restore only runs when the server had nothing, so a signed-in
  // customer's stored draft always wins over a stale copy in this browser.
  useEffect(() => {
    if (initialDraft) {
      return;
    }
    try {
      const raw = window.localStorage.getItem(LOCAL_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LocalDraft;
      if (parsed?.config?.productType) {
        setConfig(parsed.config);
        setNotes(parsed.notes ?? "");
        setDesignTouched(true);
        setNotesTouched(Boolean(parsed.notes));
        setRestoredNotice(true);
      }
    } catch {
      // A corrupt local draft is not worth surfacing — the studio simply
      // starts fresh.
    }
  }, [initialDraft]);

  // Shown once, then dismissed for good. A draft being restored is worth
  // saying, but not worth saying on every autosave.
  useEffect(() => {
    if (!restoredNotice) return;
    const timer = window.setTimeout(() => setRestoredNotice(false), 8000);
    return () => window.clearTimeout(timer);
  }, [restoredNotice]);

  const hasUnsavedWork = designTouched || notesTouched || images.length > 0;

  useEffect(() => {
    if (submitted || !hasUnsavedWork) {
      return;
    }
    try {
      const draft: LocalDraft = {productType: config.productType, config, notes};
      window.localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Private-browsing quota failures shouldn't break the studio.
    }
  }, [config, notes, submitted, hasUnsavedWork]);

  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!signedIn) {
      return null;
    }
    try {
      const response = await fetch("/api/custom-request", {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({configuration: config, notes, currency})
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const id = payload?.draft?.id ?? null;
      if (id) setRequestId(id);
      return id;
    } catch {
      return null;
    }
  }, [config, notes, currency, signedIn]);

  // Debounced autosave. Only runs once the customer has genuinely changed
  // something, so merely opening the page never creates a draft row.
  useEffect(() => {
    if (!signedIn || submitted || !hasUnsavedWork) {
      return;
    }
    const timer = window.setTimeout(() => {
      void saveDraft();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [config, notes, signedIn, submitted, hasUnsavedWork, saveDraft]);

  // Only warns when there is real unsaved work, and never after submitting.
  useEffect(() => {
    if (submitted || !hasUnsavedWork) {
      return;
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [submitted, hasUnsavedWork]);

  // ---------------------------------------------------------------------
  // Progress
  // ---------------------------------------------------------------------

  const completion: Record<StepKey, boolean> = {
    design: designTouched,
    inspiration: images.length > 0,
    details: notesTouched && notes.trim().length > 0,
    review: false
  };

  // The studio needs something expressed in the customer's own terms before
  // a request is worth a maker's time — a configuration alone says what
  // shape it is, not what it is for.
  const canSubmit = designTouched && (images.length > 0 || notes.trim().length > 0);
  completion.review = canSubmit;

  function scrollTo(key: StepKey) {
    const target =
      key === "design" ? designRef.current : key === "inspiration" ? inspirationRef.current : detailsRef.current;
    target?.scrollIntoView({behavior: "smooth", block: "center"});
  }

  // ---------------------------------------------------------------------
  // Type switching
  // ---------------------------------------------------------------------

  function selectType(next: CustomProductType) {
    if (next === config.productType) return;
    // Each type owns its own schema, so switching starts that type's own
    // defaults rather than carrying over fields it has no place for.
    setConfig(defaultConfigFor(next));
    setDesignTouched(true);
  }

  function updateConfig(next: CustomConfig) {
    setConfig(next);
    setDesignTouched(true);
  }

  function updateNotes(next: string) {
    setNotes(next);
    setNotesTouched(true);
  }

  // ---------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      // The draft must exist server-side before it can be promoted, which
      // also covers the case where every autosave so far has failed.
      await saveDraft();

      const response = await fetch("/api/custom-request", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({configuration: config, notes, currency})
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setSubmitError(
          typeof payload?.error === "string" ? payload.error : "Could not send your request. Please try again."
        );
        return;
      }

      try {
        window.localStorage.removeItem(LOCAL_DRAFT_KEY);
      } catch {
        // Nothing to do — the draft is cleared server-side regardless.
      }

      setSubmitted(payload.request as CustomRequestView);
      setReviewOpen(false);
    } catch {
      setSubmitError("Could not reach the studio. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function startOver() {
    setConfig(defaultConfigFor(config.productType));
    setNotes("");
    setImages([]);
    setDesignTouched(false);
    setNotesTouched(false);
    setRequestId(null);
    try {
      window.localStorage.removeItem(LOCAL_DRAFT_KEY);
    } catch {
      // Ignored.
    }
    if (signedIn) {
      await fetch("/api/custom-request", {method: "DELETE"}).catch(() => null);
    }
  }

  if (submitted) {
    return <SuccessState request={submitted} productType={submitted.productType} currency={currency} />;
  }

  return (
    <div className="shell space-y-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="lg:max-w-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-500">Custom Studio</p>
          <h1 className="mt-2.5 font-display text-4xl leading-[1.1] text-forest-900 sm:text-5xl">
            Create your
            <br />
            one-of-a-kind {noun}
            <Leaf className="ml-2 inline-block h-6 w-6 text-forest-500" />
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-forest-600">
            Design something personal.
            <br />
            We&apos;ll handcraft it with care.
          </p>
        </div>

        <div className="flex flex-1 items-start gap-6 lg:justify-end">
          <ol className="hidden flex-1 items-center justify-between gap-2 lg:flex">
            {steps.map((step, index) => {
              const done = completion[step.key];
              return (
                <li key={step.key} className="flex flex-1 items-center gap-2 last:flex-none">
                  <button
                    type="button"
                    onClick={() => (step.key === "review" ? setReviewOpen(canSubmit) : scrollTo(step.key))}
                    disabled={step.key === "review" && !canSubmit}
                    className="flex items-center gap-2.5 text-left disabled:cursor-not-allowed"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-300 ${
                        done
                          ? "bg-forest-900 text-sand-50"
                          : "border border-[#ddd5c4] bg-[#faf6ec] text-forest-500"
                      }`}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="hidden xl:block">
                      <span className={`block text-[12px] font-semibold ${done ? "text-forest-900" : "text-forest-600"}`}>
                        {step.label}
                      </span>
                      <span className="block text-[10px] text-forest-400">{step.hint}</span>
                    </span>
                  </button>
                  {index < steps.length - 1 ? (
                    <span
                      className={`h-px flex-1 transition-colors duration-500 ${done ? "bg-forest-400" : "bg-[#ddd5c4]"}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>

          <HowItWorks />
        </div>
      </div>

      {restoredNotice ? (
        <p className="flex items-center gap-2 rounded-2xl border border-[#e4dcc9] bg-[#faf6ec] px-4 py-2.5 text-[12px] text-forest-600">
          <RotateCcw className="h-3.5 w-3.5 text-forest-500" />
          Your draft was restored.
          <button type="button" onClick={() => void startOver()} className="ml-1 underline underline-offset-2">
            Start over
          </button>
        </p>
      ) : null}

      {/* Product type tabs */}
      <div className="flex flex-wrap gap-2">
        {customProductTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => selectType(type)}
            aria-pressed={config.productType === type}
            className={`rounded-full border px-5 py-2 text-[12px] font-medium transition-all duration-200 ${
              config.productType === type
                ? "border-forest-900 bg-forest-900 text-sand-50"
                : "border-[#ddd5c4] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
            }`}
          >
            {customTypeTabLabel[type]}
          </button>
        ))}
      </div>

      {/* Three-column workspace */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,25fr)_minmax(0,45fr)_minmax(0,30fr)]">
        <div ref={designRef} className="rounded-[1.6rem] border border-[#e0d8c7] bg-[#fdfaf3] p-5">
          <ConfigPanel config={config} onChange={updateConfig} catalogue={catalogue} />
        </div>

        <div className="min-h-[26rem] rounded-[1.6rem] border border-[#e0d8c7] bg-[#fdfaf3] p-4 lg:min-h-[34rem]">
          <PreviewPanel config={config} catalogue={catalogue} />
        </div>

        <div ref={inspirationRef} className="rounded-[1.6rem] border border-[#e0d8c7] bg-[#fdfaf3] p-5">
          <div ref={detailsRef}>
            <InspirationPanel
              images={images}
              onImagesChange={setImages}
              notes={notes}
              onNotesChange={updateNotes}
              requestId={requestId}
              signedIn={signedIn}
              onNeedsDraft={saveDraft}
            />
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div className="flex flex-col gap-5 rounded-[1.6rem] border border-[#e0d8c7] bg-[#fdfaf3] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid flex-1 gap-5 sm:grid-cols-3">
          <Tip icon={Heart} title="Tip: Simple is beautiful." body="Clear photos and simple details give the best result." />
          <Tip icon={Leaf} title="Every piece is handmade" body="with care and attention." />
          <Tip icon={Lock} title="Secure & private" body="Your ideas are safe with us." />
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2.5 lg:w-72">
          <EstimatePanel estimate={estimate} currency={currency} />

          {signedIn ? (
            <button
              type="button"
              onClick={() => setReviewOpen(true)}
              disabled={!canSubmit}
              className="button-lift flex items-center justify-center gap-2 rounded-full bg-forest-900 px-6 py-3.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Review &amp; submit request
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/login"
              className="button-lift flex items-center justify-center gap-2 rounded-full bg-forest-900 px-6 py-3.5 text-sm font-semibold text-sand-50"
            >
              Sign in to send your request
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          {signedIn && !canSubmit ? (
            <p className="text-center text-[11px] leading-relaxed text-forest-500">
              Add a photo or a note so the studio knows what you&apos;re picturing.
            </p>
          ) : null}
        </div>
      </div>

      {reviewOpen ? (
        <ReviewPanel
          config={config}
          notes={notes}
          images={images}
          estimate={estimate}
          currency={currency}
          match={match}
          noun={noun}
          submitting={submitting}
          error={submitError}
          onClose={() => setReviewOpen(false)}
          onSubmit={() => void submit()}
        />
      ) : null}
    </div>
  );
}

function Tip({
  icon: Icon,
  title,
  body
}: {
  icon: typeof Heart;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forest-500" />
      <div>
        <p className="text-[12px] font-semibold text-forest-900">{title}</p>
        <p className="text-[11px] leading-relaxed text-forest-600">{body}</p>
      </div>
    </div>
  );
}
