"use client";

import {useEffect, useRef} from "react";
import {createPortal} from "react-dom";
import {X} from "lucide-react";

export type HeroFact = {
  id: string;
  kicker: string;
  title: string;
  lede: string;
  body: string;
  image: string;
  imageAlt: string;
  /** Official goal tiles are shown whole; photographs are cropped to fill. */
  contain?: boolean;
};

// Placeholder photographs for now: they come from the existing brand library and can be
// swapped for dedicated pictures by changing the `image` paths below.
export const VALUE_FACTS: HeroFact[] = [
  {
    id: "materials",
    kicker: "Materials",
    title: "Natural Materials",
    lede: "Fibres of the archipelago.",
    body: "Agel, mendong, water hyacinth and tenun, gathered and plaited by hand.",
    image: "/images/natlovers-bags-2.webp",
    imageAlt: "Natural-fibre Natlovers bag with embroidered flowers"
  },
  {
    id: "handcrafted",
    kicker: "Atelier",
    title: "Handcrafted",
    lede: "One bag, many hands.",
    body: "A dozen artisans shape every piece, among them makers who are deaf, mute or live with polio. Fair work, valued for its craft.",
    image: "/images/natlovers-bags-4.webp",
    imageAlt: "Handcrafted Natlovers bags in natural fibre and colour"
  },
  {
    id: "sustainable",
    kicker: "Approach",
    title: "Sustainable",
    lede: "Slow by design.",
    body: "Small batches, renewable fibres, finished by hand and built to be repaired. Scarcity from time, never from marketing.",
    image: "/images/natlovers-bags-1.jpg",
    imageAlt: "A collection of Natlovers bags"
  }
];

export const SDG_FACTS: HeroFact[] = [
  {
    id: "sdg-8",
    kicker: "UN SDG 8",
    title: "Decent Work and Economic Growth",
    lede: "Craft as a livelihood.",
    body: "Fair, skilled work for Yogyakarta's artisans, including makers with disabilities.",
    image: "/images/sdg/sdg-8.webp",
    imageAlt: "UN Sustainable Development Goal 8: Decent Work and Economic Growth",
    contain: true
  },
  {
    id: "sdg-12",
    kicker: "UN SDG 12",
    title: "Responsible Consumption and Production",
    lede: "Fewer things, longer lives.",
    body: "Renewable fibres and small batches, made to be mended and kept for years.",
    image: "/images/sdg/sdg-12.webp",
    imageAlt: "UN Sustainable Development Goal 12: Responsible Consumption and Production",
    contain: true
  },
  {
    id: "sdg-11",
    kicker: "UN SDG 11",
    title: "Sustainable Cities and Communities",
    lede: "Heritage, kept close to home.",
    body: "Plaiting and weaving stay alive where they began, passed from hand to hand.",
    image: "/images/sdg/sdg-11.webp",
    imageAlt: "UN Sustainable Development Goal 11: Sustainable Cities and Communities",
    contain: true
  }
];

// Fetches every card picture ahead of time so opening a card never waits on a download.
export function warmFactImages() {
  for (const item of [...VALUE_FACTS, ...SDG_FACTS]) {
    const image = new window.Image();
    image.decoding = "async";
    image.src = item.image;
  }
}

// A small card that turns once and settles, picture above, a few words below. Shown over a
// dimmed page; Escape, the close button and a tap outside all dismiss it.
export function HeroFactCard({fact, onClose}: {fact: HeroFact; onClose: () => void}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({preventScroll: true});
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.({preventScroll: true});
    };
  }, [onClose]);

  return createPortal(
    <div className="m-fact-backdrop" onClick={onClose} data-scroll-lock>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="m-fact-title"
        className="m-fact"
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="m-fact__close" onClick={onClose} aria-label="Close">
          <X aria-hidden />
        </button>
        <div className={`m-fact__image${fact.contain ? " is-tile" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fact.image} alt={fact.imageAlt} decoding="async" className={fact.contain ? "is-contain" : undefined} />
        </div>
        <div className="m-fact__text">
          <p className="m-fact__kicker">
            <span>{fact.kicker}</span>
          </p>
          <h3 id="m-fact-title" className="m-fact__title">
            {fact.title}
          </h3>
          <p className="m-fact__lede">{fact.lede}</p>
          <p className="m-fact__body">{fact.body}</p>
        </div>
        <div className="m-fact__weave" aria-hidden />
      </div>
    </div>,
    document.body
  );
}
