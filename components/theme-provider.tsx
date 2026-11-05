"use client";

import {createContext, useContext, useEffect, useState, type ReactNode} from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "nl-theme";

const ThemeContext = createContext<{theme: Theme; setTheme: (theme: Theme) => void} | null>(null);

// Keeping this in sync with the blocking script in app/layout.tsx: that
// script is what actually prevents the flash of light-mode content on a
// dark-mode visitor's first paint (it runs before React hydrates), so this
// provider's job is just to mirror the class it already set into React
// state for the toggle UI, not to apply the class itself on mount.
export function ThemeProvider({children}: {children: ReactNode}) {
  const [theme, setThemeState] = useState<Theme>("light");

  // A choice made on the site wins. Without one, the device or browser setting decides,
  // and follows it if it changes; with neither, the site is light.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    if (stored === "dark" || stored === "light") {
      setThemeState(stored);
      return;
    }
    const apply = () => {
      const next: Theme = media.matches ? "dark" : "light";
      setThemeState(next);
      document.documentElement.classList.toggle("dark", next === "dark");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled: the toggle still works for the
      // rest of this session, it just won't be remembered next visit.
    }
  }

  return <ThemeContext.Provider value={{theme, setTheme}}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
