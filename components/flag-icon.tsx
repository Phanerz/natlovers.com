import type {Locale} from "@/lib/site";

// Hand-drawn, not emoji - flag emoji renders as a plain two-letter code box
// on Windows (a long-standing OS-level policy choice), which would defeat
// the point of a flag selector entirely for a real slice of visitors. These
// are small enough (used at icon size, ~20x14) that exact heraldic
// precision doesn't matter; reading unmistakably as "British" / "Indonesian"
// at a glance does.

export function UKFlagIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden focusable="false">
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="6.6" />
      <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="4" />
    </svg>
  );
}

export function IndonesiaFlagIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 30 20" className={className} aria-hidden focusable="false">
      <rect width="30" height="10" fill="#CE1126" />
      <rect width="30" height="10" y="10" fill="#fff" />
    </svg>
  );
}

export function FlagIcon({locale, className}: {locale: Locale; className?: string}) {
  return locale === "en" ? <UKFlagIcon className={className} /> : <IndonesiaFlagIcon className={className} />;
}
