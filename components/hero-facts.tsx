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
    lede: "Grown, not made.",
    body: "Agel, mendong, water hyacinth and tenun, gathered close to home and shaped slowly by hand. No two bags ever come out the same.",
    image: "/images/fact-materials.webp",
    imageAlt: "Natural-fibre Natlovers bag with embroidered flowers"
  },
  {
    id: "handcrafted",
    kicker: "Atelier",
    title: "Handcrafted",
    lede: "Made by many hands.",
    body: "Every bag travels through a dozen of our makers in Yogyakarta, some of them deaf, mute or living with polio. Their skill is in every stitch.",
    image: "/images/fact-handcrafted.webp",
    imageAlt: "Handcrafted Natlovers bags in natural fibre and colour"
  },
  {
    id: "sustainable",
    kicker: "Approach",
    title: "Sustainable",
    lede: "Made to be kept.",
    body: "We work in small batches and mend what we make. A Natlovers bag is meant to be loved for years, not replaced next season.",
    image: "/images/fact-sustainable.webp",
    imageAlt: "A collection of Natlovers bags"
  }
];

export const SDG_FACTS: HeroFact[] = [
  {
    id: "sdg-8",
    kicker: "UN SDG 8",
    title: "Decent Work and Economic Growth",
    lede: "Work with dignity.",
    body: "Fair pay and steady work for our makers in Yogyakarta, including those with disabilities, so craft can be a real livelihood.",
    image: "/images/sdg/sdg-8.webp",
    imageAlt: "UN Sustainable Development Goal 8: Decent Work and Economic Growth",
    contain: true
  },
  {
    id: "sdg-12",
    kicker: "UN SDG 12",
    title: "Responsible Consumption and Production",
    lede: "Less, but better.",
    body: "We make in small batches from fibres that grow back, and we repair what we sell, so each piece can stay with you for years.",
    image: "/images/sdg/sdg-12.webp",
    imageAlt: "UN Sustainable Development Goal 12: Responsible Consumption and Production",
    contain: true
  },
  {
    id: "sdg-11",
    kicker: "UN SDG 11",
    title: "Sustainable Cities and Communities",
    lede: "Craft stays home.",
    body: "Plaiting and weaving live in people's hands. By keeping our workshop in Yogyakarta, we keep this heritage where it began.",
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

// Opens a card only once its picture is decoded (or after a short wait), so the turn never
// has to share the phone's attention with a picture still being unpacked.
export function decodeFactImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.src = src;
    const done = () => resolve();
    window.setTimeout(done, 350);
    if (image.decode) image.decode().then(done, done);
    else image.onload = done;
  });
}

// A small card that turns once and settles, picture above, a few words below. Shown over a
// dimmed page; Escape, the close button and a tap outside all dismiss it.
export function HeroFactCard({fact, onClose}: {fact: HeroFact; onClose: () => void}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Anything that loops underneath is paused while the card turns.
    document.documentElement.classList.add("fact-open");
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus({preventScroll: true});
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("fact-open");
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
        <div className={`m-fact__image${fact.contain ? " is-tile" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fact.image} alt={fact.imageAlt} decoding="async" className={fact.contain ? "is-contain" : undefined} />
          <button ref={closeRef} type="button" className="m-fact__close" onClick={onClose} aria-label="Close"> <X aria-hidden /> </button>
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
