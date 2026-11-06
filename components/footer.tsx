"use client";

import Link from "next/link";
import type {Route} from "next";
import {usePathname} from "next/navigation";
import {OPEN_CONSENT_EVENT} from "@/components/cookie-consent";
import {LEGAL_LINKS} from "@/lib/legal";
import {Instagram, Mail, MapPin, MessageCircle} from "lucide-react";
import {siteConfig} from "@/lib/site";
import {getDictionary} from "@/lib/translations";
import {useSitePreferences} from "@/components/site-preferences-provider";

export function Footer() {
  const {locale} = useSitePreferences();
  const dict = getDictionary(locale);
  const pathname = usePathname();

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
            <Mail className="h-4 w-4" /> natlovers@gmail.com
          </p>
        </div>
        <div className="space-y-3 text-sm text-forest-700">
          <p className="muted">Follow</p>
          <Link href="https://www.instagram.com/natlovers1998/?hl=en" className="flex items-center gap-2 hover:text-forest-900">
            <Instagram className="h-4 w-4" /> @natlovers1998
          </Link>
          <Link href="https://wa.me/628122697007" className="flex items-center gap-2 hover:text-forest-900">
            <MessageCircle className="h-4 w-4" /> Anita Yan: +62 812-2697-007
          </Link>
          <Link href="https://wa.me/6281125001888" className="flex items-center gap-2 hover:text-forest-900">
            <MessageCircle className="h-4 w-4" /> Phanuel: +62 811-2500-1888
          </Link>
        </div>
      </div>
      <div className="border-t border-forest-100/70">
        <div className="shell flex flex-col gap-3 py-5 text-sm text-forest-600 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Natlovers. Made by hand in Yogyakarta.</p>
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