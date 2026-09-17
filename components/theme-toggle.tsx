"use client";

import {Moon, Sun} from "lucide-react";
import {useTheme} from "@/components/theme-provider";

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();

  return (
    <div className="card flex items-center justify-between gap-4 px-4 py-4">
      <div>
        <p className="font-medium text-forest-900">Appearance</p>
        <p className="mt-0.5 text-sm text-forest-600">Switch between light and dark mode.</p>
      </div>
      <div className="liquid-glass-on-light relative flex w-44 shrink-0 rounded-full p-1">
        <span className={`liquid-glass-active-on-light theme-toggle-thumb ${theme === "dark" ? "is-dark" : ""}`} />
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={theme === "light"}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition-colors duration-200 ${
            theme === "light" ? "text-sand-50" : "text-forest-600"
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition-colors duration-200 ${
            theme === "dark" ? "text-sand-50" : "text-forest-600"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          Dark
        </button>
      </div>
    </div>
  );
}
