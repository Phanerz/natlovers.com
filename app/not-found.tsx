"use client";

import {DaisyLoader} from "@/components/daisy-loader";
import {useSitePreferences} from "@/components/site-preferences-provider";

// The 404 reuses the loading screen's daisy (petals falling and regrowing)
// with its own captions. No progress bar: nothing is loading here, and a bar
// sweeping forever would suggest the page is about to appear.
const MESSAGES = {
  en: [
    "Sorry, this page seems to have wandered off...",
    "Seems like this page is unavailable, or never existed...",
    "Nothing here yet, have you double-checked the address..."
  ],
  id: [
    "Maaf, halaman ini sepertinya sudah pergi entah ke mana...",
    "Sepertinya halaman ini tidak tersedia, atau memang tidak pernah ada...",
    "Belum ada apa-apa di sini, sudah dicek ulang alamatnya..."
  ]
};

export default function NotFound() {
  const {locale} = useSitePreferences();

  return <DaisyLoader messages={MESSAGES[locale === "id" ? "id" : "en"]} showProgress={false} />;
}
