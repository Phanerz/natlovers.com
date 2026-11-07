"use client";

import Link from "next/link";
import type {Route} from "next";
import {usePathname} from "next/navigation";
import {useCallback, useEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Globe2, Instagram, Mail, MapPin, MessageCircle, X} from "lucide-react";
import {OPEN_CONSENT_EVENT, OPEN_REGION_EVENT} from "@/components/cookie-consent";
import {CountryFlag} from "@/components/consent/country-flag";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useContact} from "@/components/use-contact";
import {countryName} from "@/lib/countries";
import {LEGAL_LINKS} from "@/lib/legal";
import {siteConfig} from "@/lib/site";
import {whatsappLink} from "@/lib/studio-contact";
import {getDictionary} from "@/lib/translations";

// Pages with no footer: the home page (the hero, which already carries About and Outlets as its
// own sections), the About page, and the pages that are a tool rather than a document.
function hasNoFooter(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname === "/" ||
    pathname === "/about" ||
    pathname === "/catalogue" ||
    pathname === "/login" ||
    pathname === "/aoh" ||
    pathname.startsWith("/mimin") ||
    pathname.startsWith("/account")
  );
}

// How close to the very bottom counts as "at the bottom", and how far back up closes it again.
const AT_BOTTOM_PX = 4;
const LEAVE_PX = 70;
// A page this close to the height of the screen has nothing to scroll, so no footer rises on its own.
const MIN_SCROLLABLE_PX = 120;

// The footer is not part of the page. When the visitor scrolls all the way to the bottom, it rises
// from below as a sheet and the page behind softens; scrolling back up, pressing Escape, tapping
// the softened page or the close button puts it away. Ivory in light mode, olive in dark mode,
// the same surface as every other pop-up.
export function Footer() {
  const pathname = usePathname();
  const {locale, country, currency} = useSitePreferences();
  const dict = getDictionary(locale);
  const contact = useContact();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  // Set after the visitor puts the footer away by hand, so it does not spring straight back up while
  // they are still at the bottom. Cleared once they scroll away from the bottom.
  const dismissed = useRef(false);
  const sheetRef = useRef<HTMLElement>(null);
  const disabled = hasNoFooter(pathname);

  useEffect(() => setMounted(true), []);

  // A new page starts closed.
  useEffect(() => {
    setOpen(false);
    dismissed.current = false;
  }, [pathname]);

  useEffect(() => {
    if (disabled) return;
    let frame = 0;
    let lastY = window.scrollY;

    function check() {
      frame = 0;
      const doc = document.documentElement;
      const y = window.scrollY;
      const distance = doc.scrollHeight - window.innerHeight - y;
      const scrollable = doc.scrollHeight - window.innerHeight > MIN_SCROLLABLE_PX;
      const goingDown = y > lastY;
      lastY = y;
      if (distance > LEAVE_PX) {
        dismissed.current = false;
        setOpen(false);
      } else if (distance <= AT_BOTTOM_PX && scrollable && goingDown && !dismissed.current) {
        setOpen(true);
      }
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, {passive: true});
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [disabled, pathname]);

  const close = useCallback(() => {
    dismissed.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (disabled || !mounted) return null;

  return createPortal(
    <>
      <div className={`ft-backdrop ${open ? "is-open" : ""}`} onClick={close} aria-hidden />
      <footer
        ref={sheetRef}
        className={`ft-sheet ${open ? "is-open" : ""}`}
        aria-label="Site footer"
        // Closed means out of the tab order and hidden from screen readers; it is revealed by scrolling.
        inert={!open}
      >
        <button type="button" className="ft-close" onClick={close} aria-label="Close footer">
          <X aria-hidden className="h-5 w-5" />
        </button>

        <div className="ft-inner">
          <div className="ft-brand">
            <p className="ft-wordmark font-display">Natlovers</p>
            <p className="ft-lede">{locale === "en" ? siteConfig.descriptionEn : siteConfig.descriptionId}</p>
            <p className="ft-note">{dict.footer.note}</p>
          </div>

          <div className="ft-col">
            <p className="ft-label">Studio</p>
            <p className="ft-line">
              <MapPin aria-hidden className="ft-icon" />
              <span>Jl. Tata Bumi Selatan No.107, Banyuraden, Gamping, Sleman, Yogyakarta</span>
            </p>
            <a href={`mailto:${contact.email}`} className="ft-line ft-link">
              <Mail aria-hidden className="ft-icon" />
              <span>{contact.email}</span>
            </a>
          </div>

          <div className="ft-col">
            <p className="ft-label">Follow &amp; chat</p>
            <Link href="https://www.instagram.com/natlovers1998/?hl=en" className="ft-line ft-link">
              <Instagram aria-hidden className="ft-icon" />
              <span>@natlovers1998</span>
            </Link>
            {contact.whatsapp.map((entry) => (
              <Link key={entry.number} href={whatsappLink(entry.number) as Route} className="ft-line ft-link">
                <MessageCircle aria-hidden className="ft-icon" />
                <span>
                  {entry.name}: {entry.number}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="ft-bar">
          <p className="ft-copy">&copy; {new Date().getFullYear()} Natlovers. Made by hand in Yogyakarta.</p>
          <nav aria-label="Policies" className="ft-policies">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.href} href={link.href as Route} className="ft-link">
                {link.label}
              </Link>
            ))}
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className="ft-link ft-button">
              Cookie settings
            </button>
          </nav>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_REGION_EVENT))}
            className="ft-region"
            aria-label={`Location and currency: ${country ? countryName(country) : "not chosen"}, ${currency}. Change`}
          >
            {country ? <CountryFlag code={country} /> : <Globe2 aria-hidden className="h-4 w-4" />}
            <span>
              {country ? countryName(country) : "Choose location"} &middot; {currency}
            </span>
          </button>
        </div>
      </footer>
    </>,
    document.body
  );
}
