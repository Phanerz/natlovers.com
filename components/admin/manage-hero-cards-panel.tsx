"use client";

import Image from "next/image";
import {ArrowDown, ArrowUp, Trash2} from "lucide-react";
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
  onReorder: (card: AdminHeroCard, direction: "up" | "down") => void;
  busyId: string | null;
}) {
  const ordered = [...cards].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <h2 className="font-display text-2xl text-forest-900">Manage Hero Cards ({ordered.length})</h2>

      {loading ? (
        <p className="py-10 text-center text-sm text-forest-600">Loading hero cards...</p>
      ) : ordered.length ? (
        <div className="space-y-3">
          {ordered.map((card, index) => {
            const busy = busyId === card.id;

            return (
              <div
                key={card.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e7ddc6] bg-[#fffdf9] p-4"
              >
                <CardPreview card={card} />

                <div className="min-w-[12rem] flex-1">
                  <p className="font-display text-base capitalize text-forest-900">{card.cardType}</p>
                  <p className="line-clamp-2 text-sm text-forest-600">
                    {card.cardType === "color" ? card.colorValue : "Image card"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => onReorder(card, "up")}
                    aria-label="Move up"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === ordered.length - 1}
                    onClick={() => onReorder(card, "down")}
                    aria-label="Move down"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-forest-700 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(card)}
                    aria-label="Delete hero card"
                    className="icon-button flex h-9 w-9 items-center justify-center rounded-full border border-[#d4c5ab] text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-forest-600">No hero cards yet.</p>
      )}
    </div>
  );
}
