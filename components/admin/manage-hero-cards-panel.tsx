"use client";

import Image from "next/image";
import {Reorder, useDragControls} from "framer-motion";
import {useEffect, useRef, useState} from "react";
import {GripVertical, Trash2} from "lucide-react";
import {AdminHeroCard} from "./hero-card-types";

function CardPreview({card}: {card: AdminHeroCard}) {
  if (card.cardType === "image" && card.imageUrl) {
    return (
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#d9ccb3] bg-[#f2ecdc]">
        <Image src={card.imageUrl} alt="Hero card image" fill className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="h-14 w-14 shrink-0 rounded-xl border border-[#d9ccb3]"
      style={{backgroundColor: card.colorValue ?? "#7a7a7a"}}
    />
  );
}

function HeroCardRow({
  card,
  busy,
  onDelete,
  onDragEnd
}: {
  card: AdminHeroCard;
  busy: boolean;
  onDelete: (card: AdminHeroCard) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={card}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e7ddc6] bg-[#fffdf9] p-4"
      whileDrag={{boxShadow: "0 14px 32px rgba(23,32,21,0.18)", scale: 1.01}}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        onPointerDown={(event) => dragControls.start(event)}
        className="glass-icon-btn flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full text-forest-500 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <CardPreview card={card} />

      <div className="min-w-[12rem] flex-1">
        <p className="font-display text-base capitalize text-forest-900">{card.cardType}</p>
        <p className="line-clamp-2 text-sm text-forest-600">{card.cardType === "color" ? card.colorValue : "Image card"}</p>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(card)}
        aria-label="Delete hero card"
        className="glass-icon-btn is-danger flex h-9 w-9 items-center justify-center rounded-full text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

export function ManageHeroCardsPanel({
  cards,
  loading,
  onDelete,
  onReorder,
  busyId
}: {
  cards: AdminHeroCard[];
  loading: boolean;
  onDelete: (card: AdminHeroCard) => void;
  onReorder: (orderedIds: string[]) => void;
  busyId: string | null;
}) {
  const [order, setOrder] = useState<AdminHeroCard[]>(() => [...cards].sort((a, b) => a.displayOrder - b.displayOrder));

  // Reorder.Item's onDragEnd fires once per drag gesture — reading `order`
  // straight from the closure risks catching a render from just before the
  // final onReorder update, so the drag-end handler reads this ref instead,
  // which is always current.
  const orderRef = useRef(order);
  orderRef.current = order;

  // Re-sync from the server-confirmed list whenever it changes (initial
  // load, after a delete, after a reorder round-trips) — but not on every
  // parent re-render, so a drag in progress doesn't get yanked out from
  // under the pointer.
  useEffect(() => {
    setOrder([...cards].sort((a, b) => a.displayOrder - b.displayOrder));
  }, [cards]);

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Manage Hero Cards ({order.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading hero cards...</p>
      ) : order.length ? (
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-3">
          {order.map((card) => (
            <HeroCardRow
              key={card.id}
              card={card}
              busy={busyId === card.id}
              onDelete={onDelete}
              onDragEnd={() => onReorder(orderRef.current.map((item) => item.id))}
            />
          ))}
        </Reorder.Group>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No hero cards yet.</p>
      )}
    </div>
  );
}
