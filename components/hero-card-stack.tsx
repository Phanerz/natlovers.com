"use client";

import Image from "next/image";
import {PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState} from "react";

type HeroCardType = "color" | "image" | "testimony";

type HeroCard = {
  id: string;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
  textContent: string | null;
};

// 15 visually distinct placeholder colors, used until real content is added
// through the admin panel (and as the shape the seeded `hero_cards` rows take).
const DEFAULT_COLORS = [
  "#E63946",
  "#F3722C",
  "#F8961E",
  "#F9C74F",
  "#90BE6D",
  "#43AA8B",
  "#4D908E",
  "#277DA1",
  "#577590",
  "#5E60CE",
  "#7209B7",
  "#B5179E",
  "#F72585",
  "#FF6B6B",
  "#6D6875"
];

function defaultCards(): HeroCard[] {
  return DEFAULT_COLORS.map((color, index) => ({
    id: `placeholder-${index}`,
    cardType: "color",
    colorValue: color,
    imageUrl: null,
    textContent: null
  }));
}

const SWIPE_THRESHOLD_RATIO = 0.3;
const SWIPE_THRESHOLD_MIN = 100;
const FLY_DISTANCE = 900;
const EXIT_DURATION_MS = 320;
const MAX_ROTATION = 22;
const VISIBLE_DEPTH = 3;

const STACK_TARGETS = [
  {scale: 1, y: 0},
  {scale: 0.96, y: 12},
  {scale: 0.92, y: 22}
] as const;

function CardFace({card}: {card: HeroCard}) {
  if (card.cardType === "image" && card.imageUrl) {
    return (
      <div className="relative h-full w-full">
        <Image src={card.imageUrl} alt="" fill draggable={false} sizes="400px" className="object-cover" />
      </div>
    );
  }
  if (card.cardType === "testimony" && card.textContent) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(7,20,14,0.72),rgba(7,20,14,0.4))] p-6 text-center">
        <p className="font-display italic text-[clamp(1.1rem,1.9vw,1.5rem)] leading-snug text-white">
          &ldquo;{card.textContent}&rdquo;
        </p>
      </div>
    );
  }
  return <div className="h-full w-full" style={{backgroundColor: card.colorValue ?? "#7a7a7a"}} />;
}

function TopCard({card, onSwiped}: {card: HeroCard; onSwiped: () => void}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef<{startX: number; pointerId: number; dragging: boolean}>({
    startX: 0,
    pointerId: -1,
    dragging: false
  });

  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<1 | -1 | null>(null);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (exitDirection !== null) return;
    dragInfo.current = {startX: event.clientX, pointerId: event.pointerId, dragging: true};
    cardRef.current?.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current.dragging) return;
    setOffsetX(event.clientX - dragInfo.current.startX);
  }

  function releaseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current.dragging) return;
    dragInfo.current.dragging = false;
    cardRef.current?.releasePointerCapture(event.pointerId);
    setDragging(false);

    const width = cardRef.current?.offsetWidth ?? 400;
    const threshold = Math.max(SWIPE_THRESHOLD_MIN, width * SWIPE_THRESHOLD_RATIO);
    const delta = event.clientX - dragInfo.current.startX;

    if (Math.abs(delta) > threshold) {
      const direction: 1 | -1 = delta > 0 ? 1 : -1;
      setExitDirection(direction);
      // Two-step so the transition (only enabled once dragging === false)
      // has a starting value to animate from on the next frame, rather than
      // jumping straight to the offscreen position.
      requestAnimationFrame(() => setOffsetX(direction * FLY_DISTANCE));
      window.setTimeout(onSwiped, EXIT_DURATION_MS);
    } else {
      setOffsetX(0);
    }
  }

  const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, offsetX / 12));
  const opacity = exitDirection !== null ? 0 : 1;

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releaseDrag}
      onPointerCancel={releaseDrag}
      className="absolute inset-0 cursor-grab select-none overflow-hidden rounded-[1.2rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)] active:cursor-grabbing"
      style={{
        touchAction: "none",
        transform: `translateX(${offsetX}px) rotate(${rotation}deg)`,
        opacity,
        transition: dragging ? "none" : `transform ${EXIT_DURATION_MS}ms ease-out, opacity ${EXIT_DURATION_MS}ms ease-out`,
        zIndex: 10
      }}
    >
      <CardFace card={card} />
    </div>
  );
}

export function HeroCardStack() {
  const [cards, setCards] = useState<HeroCard[]>(defaultCards());
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/hero-cards", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data) && data.length) {
          setCards(data as HeroCard[]);
          setCurrentIndex(0);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const total = cards.length;
  const topCardId = total ? cards[currentIndex % total].id : null;

  const visible = useMemo(() => {
    if (!total) return [];
    return Array.from({length: Math.min(VISIBLE_DEPTH, total)}, (_, distance) => ({
      distance,
      card: cards[(currentIndex + distance) % total]
    }));
  }, [cards, currentIndex, total]);

  function advance() {
    if (total < 2) return;
    setCurrentIndex((index) => (index + 1) % total);
  }

  return (
    <div className="relative aspect-[4/5] w-full">
      {visible.map(({distance, card}) =>
        distance === 0 ? (
          <TopCard key={card.id} card={card} onSwiped={advance} />
        ) : (
          <div
            key={card.id}
            className="absolute inset-0 overflow-hidden rounded-[1.2rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
            style={{
              transform: `translateY(${STACK_TARGETS[distance].y}px) scale(${STACK_TARGETS[distance].scale})`,
              zIndex: 10 - distance
            }}
          >
            <CardFace card={card} />
          </div>
        )
      )}
      {!topCardId ? <div className="absolute inset-0 rounded-[1.2rem] bg-white/5" /> : null}
    </div>
  );
}
