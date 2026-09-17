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
      <div className="flex items-center gap-1 rounded-full border border-forest-100 bg-[#fdfaf3] p-1">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={theme === "light"}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            theme === "light" ? "bg-forest-900 text-sand-50" : "text-forest-600 hover:text-forest-900"
          }`}
        >
          <Sun className="h-3.5 w-3.5" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={theme === "dark"}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            theme === "dark" ? "bg-forest-900 text-sand-50" : "text-forest-600 hover:text-forest-900"
          }`}
        >
          <Moon className="h-3.5 w-3.5" />
          Dark
        </button>
      </div>
    </div>
  );
}
