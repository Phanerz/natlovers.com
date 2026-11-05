"use client";

import Image from "next/image";
import {useCallback, useEffect, useRef, useState} from "react";
import {ArrowLeft, ArrowRight, ImagePlus, Trash2} from "lucide-react";
import type {AdminHeroCard} from "./hero-card-types";

const SLIDE_TYPES = ["slide", "slide_mobile", "slide_desktop"];

// One list of photographs for the whole home page: phones show them as a swipeable carousel at the
// top of the screen, laptops show them as the background of the hero. Either way each one stays for
// 15 seconds, then the next takes its place.
export function ManageHeroPhotosPanel() {
  const [cards, setCards] = useState<AdminHeroCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/hero-cards?scope=all", {cache: "no-store"});
      const data = await response.json();
      setCards(Array.isArray(data) ? (data as AdminHeroCard[]) : []);
    } catch {
      setError("Could not load the photographs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = cards.filter((card) => SLIDE_TYPES.includes(card.cardType)).sort((a, b) => a.displayOrder - b.displayOrder);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy("upload");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.set("cardType", "slide");
        formData.set("image", file);
        const response = await fetch("/api/admin/hero-cards", {method: "POST", body: formData});
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "Could not upload that photograph.");
        }
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload that photograph.");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(card: AdminHeroCard) {
    setBusy(card.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/hero-cards?id=${encodeURIComponent(card.id)}`, {method: "DELETE"});
      if (!response.ok) throw new Error("Could not remove that photograph.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove that photograph.");
    } finally {
      setBusy(null);
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const ids = items.map((card) => card.id);
    const from = ids.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    setBusy(id);
    setError(null);
    try {
      const response = await fetch("/api/admin/hero-cards", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({order: ids})
      });
      if (!response.ok) throw new Error("Could not change the order.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not change the order.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="rounded-xl border border-[#e4b9a8] bg-[#fbeee8] px-4 py-3 text-sm text-[#8a3a24]">{error}</p> : null}

      <div className="card space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-2xl text-forest-900">Home photographs ({items.length})</h2>
            <p className="mt-1 text-sm text-forest-600">
              One set of photographs for the whole home page. On phones they are the swipeable pictures at the top of the screen; on laptops they
              fade from one to the next behind the hero. Each stays for 15 seconds. Landscape pictures, about 2400 × 1500 px, work best on both.
              With none added, phones use the built-in photographs and laptops play the video.
            </p>
          </div>
          <label className="glass-btn-primary inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-sand-50">
            <ImagePlus className="h-4 w-4" />
            {busy === "upload" ? "Uploading..." : "Add photographs"}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy === "upload"}
              onChange={(event) => void upload(event.target.files)}
            />
          </label>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-forest-600">Loading...</p>
        ) : items.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((card, index) => (
              <li key={card.id} className="overflow-hidden rounded-xl border border-[#e7ddc6] bg-[#fffdf9]">
                <div className="relative aspect-[16/10] w-full bg-[#f2ecdc]">
                  {card.imageUrl ? <Image src={card.imageUrl} alt={`Home photograph ${index + 1}`} fill sizes="320px" className="object-cover" /> : null}
                  <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white">{index + 1}</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-label="Move earlier"
                      disabled={index === 0 || busy === card.id}
                      onClick={() => void move(card.id, -1)}
                      className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700 disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move later"
                      disabled={index === items.length - 1 || busy === card.id}
                      onClick={() => void move(card.id, 1)}
                      className="glass-icon-btn flex h-9 w-9 items-center justify-center rounded-full text-forest-700 disabled:opacity-40"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove photograph"
                    disabled={busy === card.id}
                    onClick={() => void remove(card)}
                    className="glass-icon-btn is-danger flex h-9 w-9 items-center justify-center rounded-full text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-forest-600">None added yet: phones use the built-in photographs and laptops play the video.</p>
        )}
      </div>
    </div>
  );
}
