"use client";

import Link from "next/link";
import type {Route} from "next";
import {usePathname} from "next/navigation";
import {OPEN_CONSENT_EVENT, OPEN_REGION_EVENT} from "@/components/cookie-consent";
import {CountryFlag} from "@/components/consent/country-flag";
import {countryName} from "@/lib/countries";
import {LEGAL_LINKS} from "@/lib/legal";
import {Globe2, Instagram, Mail, MapPin, MessageCircle} from "lucide-react";
import {siteConfig} from "@/lib/site";
import {useContact} from "@/components/use-contact";
import {whatsappLink} from "@/lib/studio-contact";
import {getDictionary} from "@/lib/translations";
import {useSitePreferences} from "@/components/site-preferences-provider";

export function Footer() {
  const {locale, country, currency} = useSitePreferences();
  const dict = getDictionary(locale);
  const pathname = usePathname();
  const contact = useContact();

  if (
    pathname === "/catalogue" ||
    pathname === "/login" ||
    pathname === "/aoh" ||
    pathname?.startsWith("/mimin") ||
    pathname?.startsWith("/account")
  ) {
    return null;
  }

  return (
    <footer className="mt-24 border-t border-forest-100/70 bg-white/70">
      <div className="shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <p className="font-display text-3xl text-forest-900">Natlovers</p>
          <p className="max-w-md text-sm leading-7 text-forest-700">
            {locale === "en" ? siteConfig.descriptionEn : siteConfig.descriptionId}
          </p>
          <p className="text-sm text-forest-500">{dict.footer.note}</p>
        </div>
        <div className="space-y-3 text-sm text-forest-700">
          <p className="muted">Studio</p>
          <p className="flex items-start gap-2">
            <MapPin className="mt-1 h-4 w-4" /> Jl. Tata Bumi Selatan No.107, Banyuraden, Gamping, Sleman, Yogyakarta
          </p>
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> {contact.email}
          </p>
        </div>
        <div className="space-y-3 text-sm text-forest-700">
          <p className="muted">Follow</p>
          <Link href="https://www.instagram.com/natlovers1998/?hl=en" className="flex items-center gap-2 hover:text-forest-900">
            <Instagram className="h-4 w-4" /> @natlovers1998
          </Link>
          {contact.whatsapp.map((entry) => (
            <Link key={entry.number} href={whatsappLink(entry.number) as Route} className="flex items-center gap-2 hover:text-forest-900">
              <MessageCircle className="h-4 w-4" /> {entry.name}: {entry.number}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-forest-100/70">
        <div className="shell flex flex-col gap-3 py-5 text-sm text-forest-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <p>&copy; {new Date().getFullYear()} Natlovers. Made by hand in Yogyakarta.</p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_REGION_EVENT))}
              className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-forest-200 px-3.5 text-forest-800 hover:border-forest-500 hover:text-forest-900"
              aria-label={`Location and currency: ${country ? countryName(country) : "not chosen"}, ${currency}. Change`}
            >
              {country ? <CountryFlag code={country} /> : <Globe2 aria-hidden className="h-4 w-4" />}
              <span>
                {country ? countryName(country) : "Choose location"} &middot; {currency}
              </span>
            </button>
          </div>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href as Route} className="hover:text-forest-900 hover:underline">
                {link.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
              className="hover:text-forest-900 hover:underline"
            >
              Cookie settings
            </button>
          </nav>
        </div>
      </div>
    </footer>
  );
}