"use client";

import Image from "next/image";
import {AnimatePresence, PanInfo, animate, motion, useMotionValue, useTransform} from "framer-motion";
import {useEffect, useMemo, useRef, useState} from "react";

type HeroCardType = "color" | "image";

type HeroCard = {
  id: string;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
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
    imageUrl: null
  }));
}

const SWIPE_THRESHOLD_RATIO = 0.3;
const VELOCITY_THRESHOLD = 550;
const FLY_DISTANCE = 900;
const VISIBLE_DEPTH = 3;
const MAX_DRAG_ROTATION = 26;
// The resting card leans very slightly clockwise (positive deg) for a
// natural, ever-so-slightly-off-center feel — drag rotation is added on
// top of this base tilt, not in place of it.
const FRONT_CARD_BASE_TILT = 3;

// Resting transform per stack position (0 = front, 1 & 2 = cards fanned out
// behind). The offsets are deliberately larger than the front card's own
// tilt-induced silhouette growth (~15px at 3deg) and alternate to opposite
// sides, so both cards behind stay visibly peeking out instead of being
// swallowed by the tilted front card.
const STACK_TARGETS = [
  {scale: 1, x: 0, y: 0, rotate: FRONT_CARD_BASE_TILT, opacity: 1, zIndex: 3},
  {scale: 0.95, x: 26, y: 16, rotate: 10, opacity: 0.92, zIndex: 2},
  {scale: 0.9, x: -30, y: 28, rotate: -11, opacity: 0.8, zIndex: 1}
] as const;

function normalizeVector(vx: number, vy: number): {x: number; y: number} {
  const magnitude = Math.hypot(vx, vy) || 1;
  return {x: vx / magnitude, y: vy / magnitude};
}

function CardFace({card}: {card: HeroCard}) {
  if (card.cardType === "image" && card.imageUrl) {
    return (
      <div className="relative h-full w-full">
        <Image src={card.imageUrl} alt="" fill draggable={false} sizes="380px" className="object-cover" />
      </div>
    );
  }
  return <div className="h-full w-full" style={{backgroundColor: card.colorValue ?? "#7a7a7a"}} />;
}

function StackCard({
  card,
  distance,
  exitDirection,
  cardSize,
  onSwiped
}: {
  card: HeroCard;
  distance: 0 | 1 | 2;
  exitDirection: {x: number; y: number};
  cardSize: {width: number; height: number};
  onSwiped: (direction: {x: number; y: number}) => void;
}) {
  // x/y are real, independent motion values driving both the live drag and
  // the exit fling. rotate is derived from x (plus the front card's base
  // tilt) so it keeps following automatically through drag and exit alike.
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, (latest) => {
    const dragRotation = Math.max(-MAX_DRAG_ROTATION, Math.min(MAX_DRAG_ROTATION, latest / 14));
    return FRONT_CARD_BASE_TILT + dragRotation;
  });

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // The dismiss decision only looks at the horizontal component — a
    // straight up/down drag has near-zero offset.x/velocity.x, so it always
    // springs back to center regardless of how far vertically it went.
    // Diagonal throws (down-left, up-right, etc.) still count as long as
    // there's a real horizontal component, and the exit direction below
    // uses the full 2D vector so those still fly off on the actual angle.
    const thresholdX = cardSize.width * SWIPE_THRESHOLD_RATIO;
    const pastThresholdX = Math.abs(info.offset.x) > thresholdX;
    const isFastFlickX = Math.abs(info.velocity.x) > VELOCITY_THRESHOLD;

    if (pastThresholdX || isFastFlickX) {
      const source = isFastFlickX ? info.velocity : info.offset;
      onSwiped(normalizeVector(source.x, source.y));
    } else {
      animate(x, 0, {type: "spring", stiffness: 380, damping: 34});
      animate(y, 0, {type: "spring", stiffness: 380, damping: 34});
    }
  }

  return (
    <motion.div
      className={`absolute inset-0 select-none overflow-hidden rounded-[1.4rem] shadow-[0_24px_60px_-14px_rgba(0,0,0,0.55),0_10px_26px_-10px_rgba(0,0,0,0.4)] ${
        distance === 0 ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={distance === 0 ? {x, y, rotate, touchAction: "none"} : undefined}
      // Cards must never play a mount-in animation: the real hero cards load
      // from the API a beat after the placeholder colors render, and since
      // their ids differ from the placeholders', AnimatePresence treats them
      // as brand-new elements entering — which used to fade/scale them in
      // right as the page loads, reading as an unwanted "boot up" animation.
      // initial={false} makes every card (placeholder, real, or newly
      // revealed at the back of the stack during a swipe) render directly at
      // its resting `animate` position with no entrance transition; the
      // swipe drag/exit-fling behavior is untouched since that's driven by
      // the x/y motion values and the `exit` prop, not `initial`.
      initial={false}
      animate={STACK_TARGETS[distance]}
      exit={{
        x: exitDirection.x * FLY_DISTANCE,
        y: exitDirection.y * FLY_DISTANCE,
        opacity: 0,
        transition: {duration: 0.32, ease: "easeOut"}
      }}
      transition={{type: "spring", stiffness: 260, damping: 30}}
      drag={distance === 0}
      dragElastic={0.6}
      dragMomentum={false}
      onDragEnd={distance === 0 ? handleDragEnd : undefined}
      whileDrag={{scale: 1.02}}
    >
      <CardFace card={card} />
    </motion.div>
  );
}

export function HeroCardStack() {
  const [cards, setCards] = useState<HeroCard[]>(defaultCards());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<{x: number; y: number}>({x: -1, y: 0});
  const [cardSize, setCardSize] = useState({width: 320, height: 427});
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect?.width && rect?.height) setCardSize({width: rect.width, height: rect.height});
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const total = cards.length;

  const visible = useMemo(() => {
    if (!total) return [];
    return Array.from({length: Math.min(VISIBLE_DEPTH, total)}, (_, distance) => ({
      distance,
      card: cards[(currentIndex + distance) % total]
    }));
  }, [cards, currentIndex, total]);

  function advance(direction: {x: number; y: number}) {
    if (total < 2) return;
    setExitDirection(direction);
    setCurrentIndex((index) => (index + 1) % total);
  }

  return (
    <div ref={containerRef} className="relative aspect-[3/4] w-full">
      <AnimatePresence initial={false}>
        {visible.map(({distance, card}) => (
          <StackCard
            key={card.id}
            card={card}
            distance={distance as 0 | 1 | 2}
            exitDirection={exitDirection}
            cardSize={cardSize}
            onSwiped={advance}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
