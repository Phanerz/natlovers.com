"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {ArrowUpRight, ChevronDown, ChevronUp, Clock, MapPin, MessageCircle} from "lucide-react";
import type {PublicLocation} from "@/lib/locations";
import {OutletsMap} from "./outlets-map";

// Plain deep link, not the Maps JS/Embed API - no key, no billing risk.
function googleMapsUrl(location: PublicLocation) {
  const address = [location.addressLine1, location.addressLine2].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function LocationCard({
  location,
  index,
  position,
  onFocus
}: {
  location: PublicLocation;
  index: number;
  position: "prev" | "current" | "next";
  onFocus: () => void;
}) {
  const isMain = location.type === "main_studio";
  const address = [location.addressLine1, location.addressLine2].filter(Boolean).join(", ");

  return (
    <article
      className="outlet-card"
      data-pos={position}
      data-type={location.type}
      aria-hidden={position !== "current"}
      onClick={onFocus}
    >
      <span className="outlet-card__index" aria-hidden>
        {String(index + 1).padStart(2, "0")}
      </span>

      <div>
        <span className="outlet-chip">
          <span className="outlet-chip__dot" />
          {isMain ? "Main Studio" : "Stockist"}
        </span>
        <h3 className="outlet-card__name font-display">{location.name}</h3>
      </div>

      <div className="space-y-2">
        <p className="outlet-card__row">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="line-clamp-2">{address}</span>
        </p>
        {location.hoursDisplay ? (
          <p className="outlet-card__row">
            <Clock className="h-4 w-4 shrink-0" /> {location.hoursDisplay}
          </p>
        ) : null}
        {location.contact ? (
          <p className="outlet-card__row">
            <MessageCircle className="h-4 w-4 shrink-0" /> {location.contact}
          </p>
        ) : null}
        <a
          href={googleMapsUrl(location)}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={position === "current" ? 0 : -1}
          onClick={(event) => event.stopPropagation()}
          className="outlet-card__maps"
        >
          Open in Google Maps <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

// embedded = the home page's Outlets section: it sits inside the home page's
// own scroll snapping, so it must not lock the page, listen to arrow keys
// or trap touch scrolling, and the wheel passes through at either end of
// the deck so the page can keep scrolling to the neighbouring sections.
export function OutletsPageContent({locationList, embedded = false}: {locationList: PublicLocation[]; embedded?: boolean}) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;
  const [focusTick, setFocusTick] = useState(0);
  const [showAllTick, setShowAllTick] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const count = locationList.length;

  const step = useCallback(
    (direction: 1 | -1) => {
      setActive((current) => Math.min(count - 1, Math.max(0, current + direction)));
    },
    [count]
  );

  // Picking the location that's already active re-flies the map to it, so
  // clicking the card (or its pin) after panning away brings you back.
  const select = useCallback(
    (index: number) => {
      if (index === active) {
        setFocusTick((tick) => tick + 1);
      } else {
        setActive(index);
      }
    },
    [active]
  );

  // Measure where the stage actually starts (below the sticky header) so
  // the stage fills exactly the rest of the screen and the page can't scroll.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || embedded) return;
    const measure = () => {
      stage.style.setProperty("--outlets-top", `${Math.round(stage.getBoundingClientRect().top + window.scrollY)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [embedded]);

  // The page never scrolls. The wheel steps the deck ONLY while the pointer
  // is over the card itself (the listener lives on the deck, not the page),
  // so scrolling anywhere else does nothing. Arrow keys and swipes on the
  // card step it too. One step per gesture: after a step, a continuous stream of wheel
  // events (trackpad inertia, a spun mouse wheel) is ignored until it
  // settles, so a single flick can't skip several locations.
  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    let lockUntil = 0;
    let lastWheelAt = 0;
    let lastStepAt = 0;

    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const now = performance.now();
      // At either end of the deck, let the wheel through to the page, but
      // keep swallowing the inertia tail of the step that just got us here.
      const direction = event.deltaY > 0 ? 1 : -1;
      const atEdge = (direction === 1 && activeRef.current >= count - 1) || (direction === -1 && activeRef.current <= 0);
      if (embedded && atEdge && now > lockUntil + 500) {
        lastWheelAt = now;
        return;
      }
      event.preventDefault();
      const continuous = now - lastWheelAt < 70;
      lastWheelAt = now;
      if (now < lockUntil || Math.abs(event.deltaY) < 8) return;
      if (continuous && now - lastStepAt < 1400) return;
      lockUntil = now + 750;
      lastStepAt = now;
      step(event.deltaY > 0 ? 1 : -1);
    };

    deck.addEventListener("wheel", onWheel, {passive: false});
    return () => deck.removeEventListener("wheel", onWheel);
  }, [step, count, embedded]);

  useEffect(() => {
    if (embedded) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, embedded]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck || embedded) return;
    let startY: number | null = null;

    const onStart = (event: TouchEvent) => {
      startY = event.touches[0].clientY;
    };
    const onEnd = (event: TouchEvent) => {
      if (startY === null) return;
      const delta = startY - event.changedTouches[0].clientY;
      startY = null;
      if (Math.abs(delta) > 36) step(delta > 0 ? 1 : -1);
    };

    deck.addEventListener("touchstart", onStart, {passive: true});
    deck.addEventListener("touchend", onEnd, {passive: true});
    return () => {
      deck.removeEventListener("touchstart", onStart);
      deck.removeEventListener("touchend", onEnd);
    };
  }, [step, embedded]);

  if (count === 0) {
    return null;
  }

  const Heading = embedded ? "h2" : "h1";

  return (
    <div ref={stageRef} className={`outlets-stage ${embedded ? "outlets-stage--embedded" : "outlets-stage--page"}`}>
      <div className="shell flex h-full min-h-0 flex-col gap-3 py-3 lg:flex-row lg:items-center lg:gap-10 lg:py-6">
        <div className="contents lg:flex lg:w-[26rem] lg:shrink-0 lg:flex-col lg:justify-center lg:gap-6">
          <div className="order-1 space-y-2 lg:space-y-3">
            <p className="muted">Find Us</p>
            <Heading className="section-title">Visit the studio, or find Natlovers near you.</Heading>
            <p className="outlets-intro-body text-sm leading-7 text-forest-700">
              Our workshop and showroom in Yogyakarta is open to visitors by appointment. Stockist partners across
              Indonesia are added here as they come online.
            </p>
          </div>

          <div className="order-3 space-y-3">
            <div ref={deckRef} className={`outlet-deck${embedded ? " outlet-deck--embedded" : ""}`}>
              {locationList.map((location, index) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  index={index}
                  position={index < active ? "prev" : index > active ? "next" : "current"}
                  onFocus={() => select(index)}
                />
              ))}
            </div>

            <div className="outlet-controls">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous location"
                  onClick={() => step(-1)}
                  disabled={active === 0}
                  className="outlet-step"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next location"
                  onClick={() => step(1)}
                  disabled={active === count - 1}
                  className="outlet-step"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="outlet-progress" aria-hidden>
                <span style={{width: `${((active + 1) / count) * 100}%`}} />
              </div>
              <p className="outlet-counter" aria-live="polite">
                {String(active + 1).padStart(2, "0")} <span>/ {String(count).padStart(2, "0")}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="outlets-map-frame order-2">
          <OutletsMap
            locationList={locationList}
            activeIndex={active}
            focusTick={focusTick}
            showAllTick={showAllTick}
            onSelect={select}
            onShowAll={() => setShowAllTick((tick) => tick + 1)}
          />
        </div>
      </div>
    </div>
  );
}
