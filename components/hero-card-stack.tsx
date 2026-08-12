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

const DEFAULT_COLORS = [
  "#E63946", "#F3722C", "#F8961E", "#F9C74F", "#90BE6D",
  "#43AA8B", "#4D908E", "#277DA1", "#577590", "#5E60CE",
  "#7209B7", "#B5179E", "#F72585", "#FF6B6B", "#6D6875"
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
const SWIPE_THRESHOLD_MIN = 110;
const VELOCITY_THRESHOLD = 0.55; // px/ms — a fast flick swipes even under the distance threshold
const FLY_DISTANCE = 900;
const MAX_ROTATION = 16;
const VISIBLE_DEPTH = 3;

const STACK_TARGETS = [
  {scale: 1, x: 0, y: 0, rotate: 0},
  {scale: 0.95, x: 16, y: 14, rotate: 5},
  {scale: 0.9, x: -22, y: 26, rotate: -7}
] as const;

function CardFace({card}: {card: HeroCard}) {
  if (card.cardType === "image" && card.imageUrl) {
    return (
      <div className="relative h-full w-full">
        <Image src={card.imageUrl} alt="" fill draggable={false} sizes="380px" className="object-cover" />
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
  const dragInfo = useRef<{
    startX: number;
    pointerId: number;
    dragging: boolean;
    lastX: number;
    lastT: number;
    velocity: number;
  }>({
    startX: 0,
    pointerId: -1,
    dragging: false,
    lastX: 0,
    lastT: 0,
    velocity: 0
  });

  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<1 | -1 | null>(null);
  const [exitDurationMs, setExitDurationMs] = useState(320);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (exitDirection !== null) return;
    const now = performance.now();
    dragInfo.current = {
      startX: event.clientX,
      pointerId: event.pointerId,
      dragging: true,
      lastX: event.clientX,
      lastT: now,
      velocity: 0
    };
    cardRef.current?.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current.dragging) return;
    const now = performance.now();
    const dt = now - dragInfo.current.lastT;
    if (dt > 0) {
      dragInfo.current.velocity = (event.clientX - dragInfo.current.lastX) / dt;
    }
    dragInfo.current.lastX = event.clientX;
    dragInfo.current.lastT = now;
    setOffsetX(event.clientX - dragInfo.current.startX);
  }

  function releaseDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragInfo.current.dragging) return;
    dragInfo.current.dragging = false;
    cardRef.current?.releasePointerCapture(event.pointerId);
    setDragging(false);

    const width = cardRef.current?.offsetWidth ?? 380;
    const threshold = Math.max(SWIPE_THRESHOLD_MIN, width * SWIPE_THRESHOLD_RATIO);
    const delta = event.clientX - dragInfo.current.startX;
    const velocity = dragInfo.current.velocity;
    const isFastFlick = Math.abs(velocity) > VELOCITY_THRESHOLD;
    const isPastThreshold = Math.abs(delta) > threshold;

    if (isPastThreshold || isFastFlick) {
      const direction: 1 | -1 = (isFastFlick ? velocity : delta) > 0 ? 1 : -1;
      const speed = Math.min(Math.max(Math.abs(velocity), 0.3), 2.2);
      const duration = Math.max(140, 320 - speed * 80);
      setExitDurationMs(duration);
      setExitDirection(direction);
      requestAnimationFrame(() => setOffsetX(direction * FLY_DISTANCE));
      window.setTimeout(onSwiped, duration);
    } else {
      setExitDurationMs(320);
      setOffsetX(0);
    }
  }

  const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, offsetX / 14));
  const opacity = exitDirection !== null ? 0 : 1;
  const liftScale = dragging ? 1.02 : 1;

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={releaseDrag}
      onPointerCancel={releaseDrag}
      className="absolute inset-0 cursor-grab select-none overflow-hidden rounded-[1.4rem] shadow-[0_24px_60px_-14px_rgba(0,0,0,0.55),0_10px_26px_-10px_rgba(0,0,0,0.4)] active:cursor-grabbing"
      style={{
        touchAction: "none",
        transform: `translateX(${offsetX}px) rotate(${rotation}deg) scale(${liftScale})`,
        opacity,
        transition: dragging
          ? "none"
          : `transform ${exitDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${exitDurationMs}ms ease-out`,
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
            className="absolute inset-0 overflow-hidden rounded-[1.4rem] shadow-[0_18px_46px_-16px_rgba(0,0,0,0.5)] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: `translate(${STACK_TARGETS[distance].x}px, ${STACK_TARGETS[distance].y}px) scale(${STACK_TARGETS[distance].scale}) rotate(${STACK_TARGETS[distance].rotate}deg)`,
              zIndex: 10 - distance
            }}
          >
            <CardFace card={card} />
          </div>
        )
      )}
      {!topCardId ? <div className="absolute inset-0 rounded-[1.4rem] bg-white/5" /> : null}
    </div>
  );
}
