"use client";

import Image from "next/image";
import {PanInfo, animate, motion, useMotionValue, useTransform} from "framer-motion";
import {useEffect, useMemo, useRef, useState} from "react";

type HeroCardType = "color" | "image";

type HeroCard = {
  id: string;
  cardType: HeroCardType;
  colorValue: string | null;
  imageUrl: string | null;
};

const SWIPE_THRESHOLD_RATIO = 0.3;
const VELOCITY_THRESHOLD = 550;
const FLY_DISTANCE = 900;
const FLY_SECONDS = 0.3;
const VISIBLE_DEPTH = 3;
const MAX_DRAG_ROTATION = 26;
// The resting card leans very slightly clockwise for a natural, slightly off-centre feel.
const FRONT_CARD_BASE_TILT = 3;

// Resting pose per stack position (0 = front, 1 and 2 = cards fanned out behind, alternating
// sides so both stay visible). A card that has been swiped keeps the front pose while it flies.
const STACK_TARGETS = [
  {scale: 1, x: 0, y: 0, rotate: FRONT_CARD_BASE_TILT, opacity: 1, zIndex: 3},
  {scale: 0.95, x: 26, y: 16, rotate: 10, opacity: 0.92, zIndex: 2},
  {scale: 0.9, x: -30, y: 28, rotate: -11, opacity: 0.8, zIndex: 1}
] as const;
const FLYING_POSE = {...STACK_TARGETS[0], zIndex: 4};

function normalizeVector(vx: number, vy: number): {x: number; y: number} {
  const magnitude = Math.hypot(vx, vy) || 1;
  return {x: vx / magnitude, y: vy / magnitude};
}

function CardFace({card}: {card: HeroCard}) {
  if (card.cardType === "image" && card.imageUrl) {
    return (
      <div className="relative h-full w-full">
        <Image src={card.imageUrl} alt="" fill draggable={false} sizes="380px" priority className="object-cover" />
      </div>
    );
  }
  return <div className="h-full w-full" style={{backgroundColor: card.colorValue ?? "#7a7a7a"}} />;
}

// Two layers, so nothing ever changes hands: the OUTER layer only ever moves between stack
// poses (a card behind glides forward into the place of the one in front of it); the INNER
// layer only carries the finger (drag, tilt with the drag, the throw off screen).
function StackCard({
  card,
  distance,
  cardSize,
  appearSoftly,
  onSwiped,
  onGone
}: {
  card: HeroCard;
  distance: 0 | 1 | 2 | "flying";
  cardSize: {width: number; height: number};
  appearSoftly: boolean;
  onSwiped: () => void;
  onGone: () => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, (latest) => Math.max(-MAX_DRAG_ROTATION, Math.min(MAX_DRAG_ROTATION, latest / 14)));
  const pose = distance === "flying" ? FLYING_POSE : STACK_TARGETS[distance];
  const isFront = distance === 0;

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // Only the horizontal part decides: a straight up or down drag springs back, a diagonal
    // throw still counts and leaves along its own angle.
    const pastThreshold = Math.abs(info.offset.x) > cardSize.width * SWIPE_THRESHOLD_RATIO;
    const fastFlick = Math.abs(info.velocity.x) > VELOCITY_THRESHOLD;

    if (pastThreshold || fastFlick) {
      const source = fastFlick ? info.velocity : info.offset;
      const direction = normalizeVector(source.x, source.y);
      onSwiped();
      const fly = {duration: FLY_SECONDS, ease: "easeOut" as const};
      animate(y, direction.y * FLY_DISTANCE, fly);
      animate(x, direction.x * FLY_DISTANCE, fly).then(onGone);
    } else {
      animate(x, 0, {type: "spring", stiffness: 380, damping: 34});
      animate(y, 0, {type: "spring", stiffness: 380, damping: 34});
    }
  }

  return (
    <motion.div
      className="absolute inset-0 will-change-transform"
      // Cards already on screen when the page opens are simply there. A card joining the back
      // later fades in behind the others; it never comes in from outside the screen.
      initial={appearSoftly ? {...pose, opacity: 0} : false}
      animate={pose}
      transition={{type: "spring", stiffness: 260, damping: 30}}
    >
      <motion.div
        className={`h-full w-full select-none overflow-hidden rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
          isFront ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{x, y, rotate, touchAction: isFront ? "none" : undefined}}
        drag={isFront}
        dragElastic={0.6}
        dragMomentum={false}
        onDragEnd={isFront ? handleDragEnd : undefined}
        whileDrag={{scale: 1.02}}
      >
        <CardFace card={card} />
      </motion.div>
    </motion.div>
  );
}

export function HeroCardStack({onEmpty}: {onEmpty?: (empty: boolean) => void} = {}) {
  // No invented cards: until the saved cards arrive nothing is drawn, and with none saved the
  // stack (and its column) is not shown at all.
  const [cards, setCards] = useState<HeroCard[]>([]);
  // A running count of cards swiped away, never wrapped: every card on screen is keyed by its
  // place in this endless sequence, so a card coming round again is always a fresh element.
  const [position, setPosition] = useState(0);
  // Places of cards that have been thrown and are still flying off the screen.
  const [flying, setFlying] = useState<number[]>([]);
  const [interacted, setInteracted] = useState(false);
  const [cardSize, setCardSize] = useState({width: 320, height: 427});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The stack is not shown on phones and tablets, so do not fetch it there.
    if (window.matchMedia("(max-width: 1023px)").matches) return;
    let cancelled = false;
    fetch("/api/admin/hero-cards", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? (data as HeroCard[]) : [];
        setCards(list);
        setPosition(0);
        onEmpty?.(list.length === 0);
      })
      .catch(() => onEmpty?.(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const shown = useMemo(() => {
    if (!total) return [];
    const resting = Array.from({length: Math.min(VISIBLE_DEPTH, total)}, (_, distance) => ({
      slot: position + distance,
      distance: distance as 0 | 1 | 2 | "flying"
    }));
    const leaving = flying.map((slot) => ({slot, distance: "flying" as const}));
    return [...leaving, ...resting].map((item) => ({...item, card: cards[item.slot % total]}));
  }, [cards, position, flying, total]);

  // The next two cards behind the visible three are decoded ahead of time, out of sight.
  const upcoming = useMemo(() => {
    if (total <= VISIBLE_DEPTH) return [];
    return [VISIBLE_DEPTH, VISIBLE_DEPTH + 1]
      .map((offset) => cards[(position + offset) % total])
      .filter((card, index, list) => card.cardType === "image" && card.imageUrl && list.findIndex((other) => other.id === card.id) === index);
  }, [cards, position, total]);

  if (!total) return <div ref={containerRef} className="relative aspect-[3/4] w-full" />;

  return (
    <div ref={containerRef} className="relative aspect-[3/4] w-full">
      {shown.map(({slot, distance, card}) => (
        <StackCard
          key={slot}
          card={card}
          distance={distance}
          cardSize={cardSize}
          appearSoftly={interacted && distance === Math.min(VISIBLE_DEPTH, total) - 1}
          onSwiped={() => {
            if (total < 2) return;
            setInteracted(true);
            setFlying((list) => [...list, slot]);
            setPosition((count) => count + 1);
          }}
          onGone={() => setFlying((list) => list.filter((item) => item !== slot))}
        />
      ))}
      {upcoming.length ? (
        <div aria-hidden className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0">
          {upcoming.map((card) => (
            <Image key={card.id} src={card.imageUrl as string} alt="" width={380} height={507} sizes="380px" loading="eager" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
