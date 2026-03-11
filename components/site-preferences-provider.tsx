"use client";

import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {currencies, CurrencyCode, defaultCurrency, defaultLocale, locales, Locale} from "@/lib/site";

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

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(storageKeys.locale);
    const savedCurrency = window.localStorage.getItem(storageKeys.currency);

    if (savedLocale && locales.includes(savedLocale as Locale)) {
      setLocaleState(savedLocale as Locale);
    }

    if (savedCurrency && currencies.includes(savedCurrency as CurrencyCode)) {
      setCurrencyState(savedCurrency as CurrencyCode);
    }
  }, []);

  function setLocale(localeValue: Locale) {
    setLocaleState(localeValue);
    window.localStorage.setItem(storageKeys.locale, localeValue);
  }

  function setCurrency(currencyValue: CurrencyCode) {
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