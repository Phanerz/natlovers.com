"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import {MapPin} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import type {CurrencyCode} from "@/lib/site";

// The cookie notice and, right after it, a one-line location check. Both appear once per
// device: the choice is kept in this browser's own storage (and a small cookie the server can
// read), so a returning visitor is never asked again, while a new device, a new guest or a
// freshly signed-in user on a new device sees it once. It can be reopened from the footer.
//
// Choosing "Accept all" lets us count one anonymous visit per new device (country and phone or
// laptop, nothing that identifies a person). "Essential only" records nothing.

type Consent = "all" | "essential";
type Step = "hidden" | "cookies" | "region";

const CONSENT_KEY = "natlovers-consent";
const REGION_KEY = "natlovers-region";
const VISIT_KEY = "natlovers-visit-logged";
export const OPEN_CONSENT_EVENT = "natlovers:open-consent";

function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as {choice?: string}) : null;
    return parsed?.choice === "all" || parsed?.choice === "essential" ? parsed.choice : null;
  } catch {
    return null;
  }
}

function saveConsent(choice: Consent) {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({choice, at: new Date().toISOString()}));
  } catch {
    // Storage blocked: the notice will simply show again next visit.
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `natlovers_consent=${choice}; max-age=31536000; path=/; SameSite=Lax${secure}`;
}

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], {type: "region"}).of(code) ?? code;
  } catch {
    return code;
  }
}

const CURRENCY_NAMES: Record<CurrencyCode, string> = {IDR: "Indonesian rupiah", USD: "US dollars"};

export function CookieConsent() {
  const pathname = usePathname();
  const {currency, setCurrency} = useSitePreferences();
  const [step, setStep] = useState<Step>("hidden");
  const [country, setCountry] = useState<string | null>(null);
  const [consent, setConsent] = useState<Consent | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  const reopened = useRef(false);

  const suggested: CurrencyCode = country === "ID" ? "IDR" : "USD";

  // Asks the connection which country this is, and records one anonymous visit when allowed.
  const startRegionStep = useCallback(async (choice: Consent) => {
    try {
      if (window.localStorage.getItem(REGION_KEY)) {
        setStep("hidden");
        return;
      }
      const response = await fetch("/api/geo", {cache: "no-store"});
      const data = (await response.json()) as {country?: string | null};
      if (!data.country) {
        // Country unknown (for example on a private connection): nothing to confirm.
        setStep("hidden");
        return;
      }
      setCountry(data.country.toUpperCase());
      setStep("region");
      if (choice === "all" && !window.localStorage.getItem(VISIT_KEY)) {
        window.localStorage.setItem(VISIT_KEY, "1");
        void fetch("/api/visit", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({device: window.innerWidth < 768 ? "phone" : "laptop"})
        }).catch(() => undefined);
      }
    } catch {
      setStep("hidden");
    }
  }, []);

  useEffect(() => {
    if (pathname?.startsWith("/mimin")) {
      setStep("hidden");
      return;
    }
    const saved = readConsent();
    setConsent(saved);
    if (reopened.current) return;
    if (!saved) {
      // A short pause, so the page settles before the note rises.
      const timer = window.setTimeout(() => setStep("cookies"), 900);
      return () => window.clearTimeout(timer);
    }
    void startRegionStep(saved);
  }, [pathname, startRegionStep]);

  useEffect(() => {
    const reopen = () => {
      reopened.current = true;
      setConsent(readConsent());
      setStep("cookies");
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  function choose(choice: Consent) {
    saveConsent(choice);
    setConsent(choice);
    if (reopened.current) {
      // Changed from the footer: just close, the location question was already settled.
      setStep("hidden");
      return;
    }
    void startRegionStep(choice);
  }

  function finishRegion(chosen: CurrencyCode | null) {
    if (chosen) setCurrency(chosen);
    try {
      window.localStorage.setItem(REGION_KEY, JSON.stringify({country, currency: chosen ?? currency, at: new Date().toISOString()}));
    } catch {
      // Storage blocked: we will simply ask again next visit.
    }
    setStep("hidden");
  }

  if (step === "hidden") return null;
  const other: CurrencyCode = suggested === "IDR" ? "USD" : "IDR";

  return (
    <div className="nl-consent" role="region" aria-label={step === "cookies" ? "Cookie notice" : "Your location"} aria-live="polite">
      <div key={step} className="nl-consent__card">
        <span className="nl-consent__hole" aria-hidden />
        {step === "cookies" ? (
          <>
            <p className="nl-consent__eyebrow">A small note</p>
            <h2 className="nl-consent__title">Cookies, kept simple</h2>
            <p className="nl-consent__text">
              We use only what keeps the shop working: your sign-in, your theme and your currency. If you say yes, we also count which country visitors come
              from, never who they are.
            </p>
            <div className="nl-consent__actions">
              <button ref={firstButton} type="button" className="nl-consent__primary" onClick={() => choose("all")}>
                Accept all
              </button>
              <button type="button" className="nl-consent__secondary" onClick={() => choose("essential")}>
                Essential only
              </button>
            </div>
            <p className="nl-consent__small">
              {consent ? `Currently: ${consent === "all" ? "accept all" : "essential only"}. ` : null}
              <Link href="/privacy">Privacy Policy</Link>
            </p>
          </>
        ) : (
          <>
            <p className="nl-consent__eyebrow">
              <MapPin aria-hidden className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
              Where are you?
            </p>
            <h2 className="nl-consent__title">Shopping from {country ? countryName(country) : "here"}?</h2>
            <p className="nl-consent__text">We will show prices in {CURRENCY_NAMES[suggested]}. You can change this any time from the menu at the top.</p>
            <div className="nl-consent__actions">
              <button type="button" className="nl-consent__primary" onClick={() => finishRegion(suggested)}>
                Yes, that&apos;s right
              </button>
              <button type="button" className="nl-consent__secondary" onClick={() => finishRegion(other)}>
                Use {CURRENCY_NAMES[other]}
              </button>
            </div>
            <p className="nl-consent__small">
              <button type="button" className="nl-consent__skip" onClick={() => finishRegion(null)}>
                Not now
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
