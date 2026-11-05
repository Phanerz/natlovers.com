"use client";

import {createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState} from "react";
import {currencies, CurrencyCode, defaultCurrency, defaultLocale, locales, Locale} from "@/lib/site";

// A first guess from the device itself, available at once: an Indonesian time zone or an
// Indonesian browser language means rupiah; anything else means US dollars.
const INDONESIAN_ZONES = ["Asia/Jakarta", "Asia/Pontianak", "Asia/Makassar", "Asia/Jayapura"];

function guessCurrencyFromDevice(): CurrencyCode {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (INDONESIAN_ZONES.includes(zone)) return "IDR";
    // Only the browser's first language counts: a visitor who merely lists Indonesian among several is not
    // thereby in Indonesia.
    const primary = (navigator.languages?.length ? navigator.languages[0] : navigator.language) ?? "";
    if (/^id(-|$)/i.test(primary) || /-ID$/i.test(primary)) return "IDR";
  } catch {
    // fall through to dollars
  }
  return "USD";
}

type SitePreferencesContextValue = {
  locale: Locale;
  currency: CurrencyCode;
  setLocale: (locale: Locale) => void;
  setCurrency: (currency: CurrencyCode) => void;
};

const SitePreferencesContext = createContext<SitePreferencesContextValue | null>(null);

const storageKeys = {
  locale: "natlovers-locale",
  currency: "natlovers-currency"
} as const;

export function SitePreferencesProvider({children}: {children: ReactNode}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [currency, setCurrencyState] = useState<CurrencyCode>(defaultCurrency);
  // Set once the visitor picks a currency themselves: from then on nothing detected may override it.
  const chosenByVisitor = useRef(false);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(storageKeys.locale);
    const savedCurrency = window.localStorage.getItem(storageKeys.currency);

    if (savedLocale && locales.includes(savedLocale as Locale)) {
      setLocaleState(savedLocale as Locale);
    }

    // A currency the visitor chose before always wins. Otherwise: the device's own settings first
    // (instant), then the country their connection comes from (a moment later, more reliable).
    // Indonesia sees rupiah; everywhere else sees US dollars. Detected values are not saved, so a
    // visitor who travels or changes device is detected afresh.
    if (savedCurrency && currencies.includes(savedCurrency as CurrencyCode)) {
      chosenByVisitor.current = true;
      setCurrencyState(savedCurrency as CurrencyCode);
      return;
    }

    setCurrencyState(guessCurrencyFromDevice());
    let cancelled = false;
    fetch("/api/geo", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {country?: string | null} | null) => {
        if (cancelled || chosenByVisitor.current || !data?.country) return;
        setCurrencyState(data.country.toUpperCase() === "ID" ? "IDR" : "USD");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  function setLocale(localeValue: Locale) {
    setLocaleState(localeValue);
    window.localStorage.setItem(storageKeys.locale, localeValue);
  }

  function setCurrency(currencyValue: CurrencyCode) {
    chosenByVisitor.current = true;
    setCurrencyState(currencyValue);
    window.localStorage.setItem(storageKeys.currency, currencyValue);
  }

  const value = useMemo(
    () => ({locale, currency, setLocale, setCurrency}),
    [currency, locale]
  );

  return <SitePreferencesContext.Provider value={value}>{children}</SitePreferencesContext.Provider>;
}

export function useSitePreferences() {
  const context = useContext(SitePreferencesContext);

  if (!context) {
    throw new Error("useSitePreferences must be used within SitePreferencesProvider");
  }

  return context;
}