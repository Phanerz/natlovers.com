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

// How close to the very bottom counts as "at the bottom", and how far back up closes it again.
const AT_BOTTOM_PX = 4;
const LEAVE_PX = 70;
// A page this close to the height of the screen has nothing to scroll, so no footer rises on its own.
const MIN_SCROLLABLE_PX = 120;
// A deliberate push (wheel or swipe) this far, with nothing left to scroll, also brings the footer up.
const SWIPE_PX = 48;
// After the footer is put away by hand, a wheel or swipe cannot bring it straight back.
const REOPEN_COOLDOWN_MS = 700;

// The thing that scrolls the page: the home page on a phone is its own fixed scroller, everything
// else scrolls the window.
function pageScroller(): HTMLElement {
  const home = document.querySelector<HTMLElement>(".home-main");
  if (home && window.getComputedStyle(home).position === "fixed") return home;
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

function distanceToEnd(el: HTMLElement): number {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

// True when something under the finger or pointer (a list, a map panel) can still scroll down, so
// the push belongs to it and not to the page.
function innerCanScrollDown(from: EventTarget | null): boolean {
  let node = from instanceof Element ? from : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflow = window.getComputedStyle(node).overflowY;
    if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight + 1 && node.scrollTop + node.clientHeight < node.scrollHeight - 1) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

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
  const closedAt = useRef(0);

  useEffect(() => setMounted(true), []);

  // A new page starts closed.
  useEffect(() => {
    setOpen(false);
    dismissed.current = false;
  }, [pathname]);

  useEffect(() => {
    let frame = 0;
    let lastY = pageScroller().scrollTop;

    function check() {
      frame = 0;
      const scroller = pageScroller();
      const y = scroller.scrollTop;
      const distance = distanceToEnd(scroller);
      const scrollable = scroller.scrollHeight - scroller.clientHeight > MIN_SCROLLABLE_PX;
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

    // Pages with nothing to scroll (a short page, the 404, a fixed-height page) never fire a scroll
    // event, so a deliberate push down brings the footer up, and a push back up puts it away.
    function push(down: boolean, target: EventTarget | null) {
      const inside = target instanceof Element && target.closest(".ft-sheet");
      if (inside) return;
      if (!down) {
        setOpen(false);
        return;
      }
      if (document.documentElement.classList.contains("scroll-locked")) return;
      if (Date.now() - closedAt.current < REOPEN_COOLDOWN_MS) return;
      if (innerCanScrollDown(target)) return;
      if (distanceToEnd(pageScroller()) > AT_BOTTOM_PX) return;
      setOpen(true);
    }
    const onWheel = (event: WheelEvent) => {
      // A wheel something else already used (the outlets deck steps cards with it) is not a push.
      if (event.defaultPrevented) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX) || Math.abs(event.deltaY) < 4) return;
      push(event.deltaY > 0, event.target);
    };
    let touchX = 0;
    let touchY = 0;
    let touchDone = false;
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchX = touch.clientX;
      touchY = touch.clientY;
      touchDone = false;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchDone) return;
      const touch = event.touches[0];
      const dy = touchY - touch.clientY;
      const dx = touchX - touch.clientX;
      if (Math.abs(dy) < SWIPE_PX || Math.abs(dy) < Math.abs(dx)) return;
      touchDone = true;
      push(dy > 0, event.target);
    };

    document.addEventListener("scroll", onScroll, {passive: true, capture: true});
    window.addEventListener("wheel", onWheel, {passive: true});
    window.addEventListener("touchstart", onTouchStart, {passive: true});
    window.addEventListener("touchmove", onTouchMove, {passive: true});
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const close = useCallback(() => {
    dismissed.current = true;
    closedAt.current = Date.now();
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

  if (!mounted) return null;

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
