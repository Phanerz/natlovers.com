"use client";

import {usePathname} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import {CookieBanner} from "@/components/consent/cookie-banner";
import {LocationModal} from "@/components/consent/location-modal";
import {PreferencesModal} from "@/components/consent/preferences-modal";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {countryName} from "@/lib/countries";
import {
  ConsentPreferences,
  OPEN_CONSENT_EVENT,
  OPEN_REGION_EVENT,
  detectCountry,
  logVisitIfAllowed,
  readConsent,
  readRegion,
  recommendedCurrency,
  saveConsent
} from "@/lib/consent";
import type {CurrencyCode} from "@/lib/site";

// Re-exported so the footer keeps one import for both of its buttons.
export {OPEN_CONSENT_EVENT, OPEN_REGION_EVENT};

// Two questions, each asked once per device, in this order:
//   1. Cookies: a bar (laptop) or sheet (phone) with Manage preferences and Accept all.
//   2. Location: "where are you?", to pick the country and the currency prices are shown in.
// Both answers are kept in this browser's own storage, so a returning visitor is never asked again
// and a new device is asked once. Either can be reopened from the footer.
//
// Nothing optional runs before the visitor has answered. Today the only optional thing is a count of
// anonymous visits (country and phone or laptop), which happens only if Analytics is allowed.
//
// A visitor who has since travelled is not switched silently: if their connection now shows a
// different country, they are asked, and a choice they made by hand is never changed on their behalf.

const SNOOZE_KEY = "natlovers-region-snoozed";
const CHECKED_KEY = "natlovers-region-checked";

function sessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function sessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Not available: the question may simply be asked again on the next page load.
  }
}

type Notice = {country: string; currency: CurrencyCode};

const CURRENCY_NAMES: Record<CurrencyCode, string> = {IDR: "Indonesian rupiah", USD: "US dollars"};

export function CookieConsent() {
  const pathname = usePathname();
  const {currency, country, setRegion} = useSitePreferences();
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [initialRegion, setInitialRegion] = useState<{country: string; currency: CurrencyCode} | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const started = useRef(false);
  const setRegionRef = useRef(setRegion);
  setRegionRef.current = setRegion;

  // After the cookie question: ask where the visitor is, or, if they already said, check whether that
  // has changed since.
  const startRegionFlow = useCallback(async () => {
    const saved = readRegion();
    if (!saved) {
      if (sessionGet(SNOOZE_KEY)) return;
      setDetected(await detectCountry());
      setInitialRegion(null);
      setRegionOpen(true);
      return;
    }
    if (saved.manual || sessionGet(CHECKED_KEY)) return;
    sessionSet(CHECKED_KEY, "1");
    const now = await detectCountry();
    if (now && now !== saved.country) {
      const suggested = recommendedCurrency(now);
      if (suggested === saved.currency) {
        // Same prices either way, so there is nothing to ask: just keep the country up to date.
        setRegionRef.current(now, saved.currency, false);
      } else {
        setNotice({country: now, currency: suggested});
      }
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const saved = readConsent();
    setConsent(saved);
    if (!saved) {
      // A short pause, so the page settles before the bar rises.
      const timer = window.setTimeout(() => setBannerOpen(true), 900);
      return () => window.clearTimeout(timer);
    }
    logVisitIfAllowed(saved);
    void startRegionFlow();
  }, [startRegionFlow]);

  // The footer reopens either question.
  useEffect(() => {
    const openPrefs = () => {
      setConsent(readConsent());
      setBannerOpen(false);
      setPrefsOpen(true);
    };
    const openRegion = async () => {
      setNotice(null);
      setDetected(await detectCountry());
      const saved = readRegion();
      setInitialRegion(saved ? {country: saved.country, currency: saved.currency} : null);
      setRegionOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, openPrefs);
    window.addEventListener(OPEN_REGION_EVENT, openRegion);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, openPrefs);
      window.removeEventListener(OPEN_REGION_EVENT, openRegion);
    };
  }, []);

  function answer(choice: {analytics: boolean; marketing: boolean}) {
    const saved = saveConsent(choice);
    setConsent(saved);
    setBannerOpen(false);
    setPrefsOpen(false);
    logVisitIfAllowed(saved);
    void startRegionFlow();
  }

  function closeRegion() {
    setRegionOpen(false);
    // "Not now" is remembered for this visit so the question does not come straight back.
    if (!readRegion()) sessionSet(SNOOZE_KEY, "1");
  }

  function saveRegion(chosenCountry: string, chosenCurrency: CurrencyCode, manual: boolean) {
    setRegion(chosenCountry, chosenCurrency, manual);
    setRegionOpen(false);
  }

  // /mimin is the shop owner's own area: no notices there.
  if (pathname?.startsWith("/mimin")) return null;

  return (
    <>
      {bannerOpen && !prefsOpen && !regionOpen ? (
        <CookieBanner
          onManage={() => setPrefsOpen(true)}
          onAcceptAll={() => answer({analytics: true, marketing: true})}
          onEssentialOnly={() => answer({analytics: false, marketing: false})}
        />
      ) : null}

      <PreferencesModal open={prefsOpen} current={consent} onSave={answer} onClose={() => setPrefsOpen(false)} />

      <LocationModal open={regionOpen} detected={detected} initial={initialRegion} onSave={saveRegion} onClose={closeRegion} />

      {notice && !regionOpen ? (
        <div className="nlc-notice" role="status" aria-live="polite">
          <p className="nlc-notice__text">
            It looks like you are in <strong>{countryName(notice.country)}</strong> now. Would you like prices in{" "}
            <strong>{CURRENCY_NAMES[notice.currency]}</strong> instead of {CURRENCY_NAMES[currency]}?
          </p>
          <div className="nlc-notice__actions">
            <button
              type="button"
              className="nlc-primary nlc-primary--small"
              onClick={() => {
                setRegion(notice.country, notice.currency, false);
                setNotice(null);
              }}
            >
              Switch to {CURRENCY_NAMES[notice.currency]}
            </button>
            <button
              type="button"
              className="nlc-secondary nlc-secondary--small"
              onClick={() => {
                // Keeping what they had is a choice: they are not asked again.
                if (country) setRegion(country, currency, true);
                setNotice(null);
              }}
            >
              Keep {CURRENCY_NAMES[currency]}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
