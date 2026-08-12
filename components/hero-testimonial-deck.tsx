"use client";

import Image from "next/image";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {AnimatePresence, PanInfo, animate, motion, useMotionValue, useTransform} from "framer-motion";
import {useEffect, useMemo, useRef, useState} from "react";
import {Locale} from "@/lib/site";

type CardType = "bag" | "testimony" | "bag_with_customer";

type TestimonialCard = {
  id: string;
  groupId: string;
  position: number;
  cardType: CardType;
  imageUrl: string | null;
  testimonyText: string | null;
  customerName: string | null;
};

const SWIPE_THRESHOLD_RATIO = 0.3;
const VELOCITY_THRESHOLD = 550;
const FLY_DISTANCE = 720;

// Resting transform per stack position (0 = front, 1 & 2 = cards peeking behind).
const STACK_TARGETS = [
  {scale: 1, y: 0, opacity: 1, zIndex: 3},
  {scale: 0.95, y: 14, opacity: 0.85, zIndex: 2},
  {scale: 0.9, y: 26, opacity: 0.6, zIndex: 1}
] as const;

function ImageCardFace({card}: {card: TestimonialCard}) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.2rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      {card.imageUrl ? (
        <Image
          src={card.imageUrl}
          alt={card.customerName ?? "Natlovers handmade bag"}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          draggable={false}
          className="object-cover"
        />
      ) : null}
    </div>
  );
}

function TestimonyCardFace({card}: {card: TestimonialCard}) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-4 rounded-[1.2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(7,20,14,0.62),rgba(7,20,14,0.28))] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
      <p className="font-display italic text-[clamp(1.1rem,1.9vw,1.5rem)] leading-snug text-white">
        &ldquo;{card.testimonyText}&rdquo;
      </p>
      {card.customerName ? (
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#f2e8d2]/72">{card.customerName}</p>
      ) : null}
    </div>
  );
}

function CardFace({card}: {card: TestimonialCard}) {
  return card.cardType === "testimony" ? <TestimonyCardFace card={card} /> : <ImageCardFace card={card} />;
}

function FallbackStaticCard({locale}: {locale: Locale}) {
  return (
    <div className="grid gap-[13px] sm:grid-cols-[minmax(0,1fr)_144px]">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[1.2rem] border border-white/12 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
        <Image
          src="/images/tas-rumah-natural.png"
          alt="Tas Rumah Natural"
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-700 hover:scale-105"
        />
      </div>
      <div className="grid gap-[13px]">
        <div className="rounded-[1.2rem] border border-white/12 bg-[#efdfbf]/10 p-4">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[#f2e8d2]/72">
            {locale === "en" ? "Collection card" : "Kartu koleksi"}
          </p>
          <p className="mt-3 font-display text-[1.75rem] leading-none text-white">Tas Rumah Collection</p>
        </div>
        <div className="rounded-[1.2rem] border border-white/12 bg-white/8 p-4 text-sm leading-7 text-[#f4ead7]/88">
          {locale === "en"
            ? "Natlovers’ signature whimsical, house-shaped handmade bag."
            : "Tas buatan tangan berbentuk rumah yang ikonik dan unik dari Natlovers."}
        </div>
      </div>
    </div>
  );
}

function StackCard({
  card,
  distance,
  exitDirection,
  cardWidth,
  onSwiped
}: {
  card: TestimonialCard;
  distance: 0 | 1 | 2;
  exitDirection: 1 | -1;
  cardWidth: number;
  onSwiped: (direction: 1 | -1) => void;
}) {
  // x is a real, independent motion value (drives drag + the fly-out exit).
  // rotate is derived from it, so it keeps following automatically through
  // both the live drag and the exit animation with no extra wiring.
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-FLY_DISTANCE, -cardWidth, 0, cardWidth, FLY_DISTANCE], [-28, -16, 0, 16, 28]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const threshold = cardWidth * SWIPE_THRESHOLD_RATIO;
    if (Math.abs(info.offset.x) > threshold || Math.abs(info.velocity.x) > VELOCITY_THRESHOLD) {
      onSwiped(info.offset.x >= 0 ? 1 : -1);
    } else {
      animate(x, 0, {type: "spring", stiffness: 420, damping: 32});
    }
  }

  return (
    <motion.div
      className="absolute inset-0"
      style={distance === 0 ? {x, rotate} : undefined}
      initial={{scale: 0.85, y: 40, opacity: 0}}
      animate={STACK_TARGETS[distance]}
      exit={{x: exitDirection * FLY_DISTANCE, opacity: 0, transition: {duration: 0.3, ease: "easeOut"}}}
      transition={{type: "spring", stiffness: 300, damping: 28}}
      drag={distance === 0 ? "x" : false}
      dragElastic={0.65}
      dragMomentum={false}
      onDragEnd={distance === 0 ? handleDragEnd : undefined}
      whileDrag={{cursor: "grabbing"}}
    >
      <CardFace card={card} />
    </motion.div>
  );
}

export function HeroTestimonialDeck({locale}: {locale: Locale}) {
  const [cards, setCards] = useState<TestimonialCard[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<1 | -1>(-1);
  const [cardWidth, setCardWidth] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/testimonials", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data) && data.length) {
          setCards(data as TestimonialCard[]);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setCardWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded]);

  const groupOrder = useMemo(() => {
    const order: string[] = [];
    for (const card of cards) {
      if (!order.includes(card.groupId)) order.push(card.groupId);
    }
    return order;
  }, [cards]);

  const total = cards.length;
  const front = total ? cards[currentIndex % total] : null;
  const activeDot = front ? groupOrder.indexOf(front.groupId) : -1;

  // Both directions just advance to the next card in display_order — there's
  // no like/dislike semantics here, `direction` only picks which way the
  // dismissed card visually flies off.
  function advance(direction: 1 | -1) {
    if (total < 2) return;
    setExitDirection(direction);
    setCurrentIndex((index) => (index + 1) % total);
  }

  function jumpToGroup(groupId: string) {
    const targetIndex = cards.findIndex((card) => card.groupId === groupId);
    if (targetIndex === -1 || targetIndex === currentIndex) return;
    setExitDirection(-1);
    setCurrentIndex(targetIndex);
  }

  const showFallback = !loaded || !front;

  return (
    <div className="relative">
      {showFallback ? (
        <FallbackStaticCard locale={locale} />
      ) : (
        <div ref={containerRef} className="relative aspect-[4/5] w-full">
          <AnimatePresence initial={false}>
            {[0, 1, 2].map((distance) => {
              const card = cards[(currentIndex + distance) % total];
              if (!card) return null;
              return (
                <StackCard
                  key={card.id}
                  card={card}
                  distance={distance as 0 | 1 | 2}
                  exitDirection={exitDirection}
                  cardWidth={cardWidth}
                  onSwiped={advance}
                />
              );
            })}
          </AnimatePresence>

          {total > 1 ? (
            <>
              <button
                type="button"
                aria-label="Show next testimonial"
                onClick={() => advance(-1)}
                className="absolute left-2 top-1/2 z-[5] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Show next testimonial"
                onClick={() => advance(1)}
                className="absolute right-2 top-1/2 z-[5] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : null}

          {groupOrder.length > 1 ? (
            <div className="absolute inset-x-0 bottom-3 z-[4] flex items-center justify-center gap-1.5">
              {groupOrder.map((groupId, index) => (
                <button
                  key={groupId}
                  type="button"
                  aria-label={`Go to testimonial ${index + 1}`}
                  onClick={() => jumpToGroup(groupId)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === activeDot ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
