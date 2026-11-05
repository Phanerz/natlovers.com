"use client";

import Image from "next/image";
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
    kicker: "Our materials",
    title: "Natural Materials",
    lede: "Fibres of the archipelago.",
    body: "Every piece begins as something grown, not manufactured: agel from the gebang palm, mendong sedge, water hyacinth, and hand-woven tenun. Each is gathered, dried and plaited by hand, which is why no two weaves are ever quite alike. We choose fibres that regrow quickly and return to the earth, and we let their own tones lead the colour of the bag.",
    image: "/images/natlovers-bags-2.webp",
    imageAlt: "Natural-fibre Natlovers bag with embroidered flowers"
  },
  {
    id: "handcrafted",
    kicker: "Our workshop",
    title: "Handcrafted",
    lede: "One bag, many hands.",
    body: "A single bag passes through a dozen pairs of hands: fibre is prepared and plaited, shaped on the form, lined and stitched, then given its embroidered garden and hand-sewn doll. Each stage belongs to a maker who has practised it for years. Our Yogyakarta workshop offers fair, steady work, including to makers who are deaf or mute (tunarunguwicara) and makers who live with the after-effects of polio. It is not charity. Their skill is the reason the pieces look the way they do.",
    image: "/images/natlovers-bags-4.webp",
    imageAlt: "Handcrafted Natlovers bags in natural fibre and colour"
  },
  {
    id: "sustainable",
    kicker: "Our approach",
    title: "Sustainable",
    lede: "Slow by design.",
    body: "We make in small batches, and to order wherever we can, so nothing is produced only to be discounted or discarded. Fibres are renewable, finishing is done by hand rather than by machine, and every bag is built to be repaired rather than replaced. Large houses create scarcity with marketing; we create it with time. Each Natlovers piece is limited only by the hours it takes to make well.",
    image: "/images/natlovers-bags-1.jpg",
    imageAlt: "A collection of Natlovers bags"
  }
];

export const SDG_FACTS: HeroFact[] = [
  {
    id: "sdg-8",
    kicker: "UN Sustainable Development Goal 8",
    title: "Decent Work and Economic Growth",
    lede: "Craft as a livelihood.",
    body: "Skilled, fairly paid work for artisans in Yogyakarta, including makers with disabilities who are too often overlooked by formal employers. Skills are taught and passed on, so that making by hand remains a profession a person can build a life on.",
    image: "/images/sdg/sdg-8.webp",
    imageAlt: "UN Sustainable Development Goal 8: Decent Work and Economic Growth",
    contain: true
  },
  {
    id: "sdg-12",
    kicker: "UN Sustainable Development Goal 12",
    title: "Responsible Consumption and Production",
    lede: "Fewer things, longer lives.",
    body: "Renewable fibres, small batches and construction meant to be mended. We would rather make a bag that is kept for twenty years than one that is replaced next season, and we measure our success by how long a piece stays in use.",
    image: "/images/sdg/sdg-12.webp",
    imageAlt: "UN Sustainable Development Goal 12: Responsible Consumption and Production",
    contain: true
  },
  {
    id: "sdg-11",
    kicker: "UN Sustainable Development Goal 11",
    title: "Sustainable Cities and Communities",
    lede: "Heritage, kept in its neighbourhood.",
    body: "Plaiting, weaving and embroidery are knowledge that lives in people. By keeping our workshop in Yogyakarta and its makers in steady work, we help this heritage stay where it was born, taught from one generation to the next.",
    image: "/images/sdg/sdg-11.webp",
    imageAlt: "UN Sustainable Development Goal 11: Sustainable Cities and Communities",
    contain: true
  }
];

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
          <Image src={fact.image} alt={fact.imageAlt} fill sizes="22rem" className={fact.contain ? "object-contain" : "object-cover"} />
        </div>
        <div className="m-fact__text">
          <p className="m-fact__kicker">{fact.kicker}</p>
          <h3 id="m-fact-title" className="m-fact__title">
            {fact.title}
          </h3>
          <p className="m-fact__lede">{fact.lede}</p>
          <p className="m-fact__body">{fact.body}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
