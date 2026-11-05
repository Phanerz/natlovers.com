"use client";

import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {DEFAULT_PORTRAIT} from "@/lib/designer-card";
import type {Locale} from "@/lib/site";
import type {DesignerCard} from "@/lib/site-content";

// Until the saved card arrives (or if it cannot), these words are used.
const FALLBACK_CARD: DesignerCard = {
  name: "Anita Yan",
  roleEn: "Founder & Designer",
  roleId: "Pendiri & Perancang",
  aboutEn: "Founded Natlovers in Yogyakarta in 1998 and leads the design of every collection.",
  aboutId: "Mendirikan Natlovers di Yogyakarta pada 1998 dan memimpin perancangan setiap koleksi.",
  photoUrl: ""
};

// "Anita Yan" in the laptop hero line. Passing the cursor over the name redraws the rule
// beneath it and brings a small card along with the pointer: a portrait and a few words.
export function DesignerName({locale}: {locale: Locale}) {
  const [drawn, setDrawn] = useState(0);
  const [open, setOpen] = useState(false);
  // The card is edited in the admin panel; it is fetched once the page is idle.
  const [card, setCard] = useState<DesignerCard>(FALLBACK_CARD);
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    let off = false;
    const timer = window.setTimeout(() => {
      fetch("/api/site-content/designer")
        .then((response) => (response.ok ? response.json() : null))
        .then((data: DesignerCard | null) => {
          if (!off && data?.name) {
            setCard(data);
            if (data.photoUrl) {
              const warm = new window.Image();
              warm.src = data.photoUrl;
            }
          }
        })
        .catch(() => undefined);
    }, 1200);
    return () => {
      off = true;
      window.clearTimeout(timer);
    };
  }, []);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({x: 0, y: 0});
  const frame = useRef(0);

  function place() {
    frame.current = 0;
    const card = cardRef.current;
    if (!card) return;
    const width = card.offsetWidth || 288;
    const height = card.offsetHeight || 120;
    const x = Math.min(pointer.current.x + 22, window.innerWidth - width - 12);
    const y = Math.min(pointer.current.y + 22, window.innerHeight - height - 12);
    card.style.transform = `translate3d(${Math.max(12, x)}px, ${Math.max(12, y)}px, 0)`;
  }

  // The card is moved with a direct style write on animation frames, never through React state.
  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(
    () => () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
    },
    []
  );

  const track = (event: React.MouseEvent) => {
    pointer.current = {x: event.clientX, y: event.clientY};
    if (!frame.current) frame.current = window.requestAnimationFrame(place);
  };

  return (
    <>
      <em
        className="hero-house__name"
        onMouseEnter={(event) => {
          track(event);
          setDrawn((count) => count + 1);
          setOpen(true);
        }}
        onMouseMove={track}
        onMouseLeave={() => setOpen(false)}
      >
        {card.name}
        <span key={drawn} className={`hero-house__rule${drawn ? " is-replay" : ""}`} aria-hidden />
      </em>
      {open
        ? createPortal(
            <div ref={cardRef} className="designer-card" role="tooltip">
              <div className="designer-card__photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.photoUrl || DEFAULT_PORTRAIT} alt={card.name} />
              </div>
              <div className="designer-card__text">
                <p className="designer-card__name">{card.name}</p>
                <p className="designer-card__role">{locale === "en" ? card.roleEn : card.roleId}</p>
                <p className="designer-card__about">{locale === "en" ? card.aboutEn : card.aboutId}</p>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
