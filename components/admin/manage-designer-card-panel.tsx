"use client";

import {useEffect, useRef, useState} from "react";
import {ImagePlus, Trash2} from "lucide-react";
import {DEFAULT_PORTRAIT} from "@/lib/designer-card";
import type {DesignerCard} from "@/lib/site-content";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

// The card that follows the cursor over "Anita Yan" on the laptop home page. Edit the words in both
// languages and the portrait; the preview on the right is the card as visitors will see it.
export function ManageDesignerCardPanel() {
  const [card, setCard] = useState<DesignerCard | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: "ok" | "error"; text: string} | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let off = false;
    fetch("/api/site-content/designer", {cache: "no-store"})
      .then((response) => response.json())
      .then((data: DesignerCard) => {
        if (!off) setCard(data);
      })
      .catch(() => {
        if (!off) setMessage({type: "error", text: "Could not load the card."});
      });
    return () => {
      off = true;
    };
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  if (!card) {
    return <div className="card p-8 text-sm text-forest-600">{message ? message.text : "Loading..."}</div>;
  }

  const shownPhoto = photoPreview ?? (removePhoto ? DEFAULT_PORTRAIT : card.photoUrl || DEFAULT_PORTRAIT);

  async function save() {
    if (!card) return;
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("name", card.name);
      formData.set("roleEn", card.roleEn);
      formData.set("roleId", card.roleId);
      formData.set("aboutEn", card.aboutEn);
      formData.set("aboutId", card.aboutId);
      if (photo) formData.set("photo", photo);
      if (removePhoto && !photo) formData.set("removePhoto", "true");
      const response = await fetch("/api/site-content/designer", {method: "PUT", body: formData});
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save the card.");
      setCard(data as DesignerCard);
      setPhoto(null);
      setRemovePhoto(false);
      if (fileInput.current) fileInput.current.value = "";
      setMessage({type: "ok", text: "Saved. The home page shows it straight away."});
    } catch (caught) {
      setMessage({type: "error", text: caught instanceof Error ? caught.message : "Could not save the card."});
    } finally {
      setSaving(false);
    }
  }

  const set = (patch: Partial<DesignerCard>) => setCard({...card, ...patch});

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="card space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="font-display text-2xl text-forest-900">Anita Yan card</h2>
          <p className="mt-1 text-sm text-forest-600">
            Shown beside the cursor when someone points at the name in the laptop home page. Fill in both languages: visitors see the one they chose.
          </p>
        </div>

        <label className="block space-y-2 text-sm text-forest-700">
          <span className="muted">Name</span>
          <input value={card.name} onChange={(event) => set({name: event.target.value})} maxLength={60} className={fieldClass} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2 text-sm text-forest-700">
            <span className="muted">Title (English)</span>
            <input value={card.roleEn} onChange={(event) => set({roleEn: event.target.value})} maxLength={60} className={fieldClass} />
          </label>
          <label className="block space-y-2 text-sm text-forest-700">
            <span className="muted">Title (Bahasa Indonesia)</span>
            <input value={card.roleId} onChange={(event) => set({roleId: event.target.value})} maxLength={60} className={fieldClass} />
          </label>
        </div>

        <label className="block space-y-2 text-sm text-forest-700">
          <span className="muted">A few words (English)</span>
          <textarea value={card.aboutEn} onChange={(event) => set({aboutEn: event.target.value})} rows={3} maxLength={240} className={fieldClass} />
          <span className="text-xs text-forest-500">{card.aboutEn.length} / 240</span>
        </label>
        <label className="block space-y-2 text-sm text-forest-700">
          <span className="muted">A few words (Bahasa Indonesia)</span>
          <textarea value={card.aboutId} onChange={(event) => set({aboutId: event.target.value})} rows={3} maxLength={240} className={fieldClass} />
          <span className="text-xs text-forest-500">{card.aboutId.length} / 240</span>
        </label>

        <div className="space-y-2 text-sm text-forest-700">
          <span className="muted">Portrait</span>
          <div className="flex flex-wrap items-center gap-3">
            <label className="glass-btn-secondary inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-forest-900">
              <ImagePlus className="h-4 w-4" />
              {photo ? "Choose another" : "Choose a photograph"}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  setPhoto(event.target.files?.[0] ?? null);
                  setRemovePhoto(false);
                }}
              />
            </label>
            {photo || card.photoUrl ? (
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setRemovePhoto(true);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Use the default picture
              </button>
            ) : null}
          </div>
          <p className="text-xs text-forest-500">A square-ish portrait works best; the face should sit near the middle.</p>
        </div>

        {message ? (
          <p className={`text-sm ${message.type === "ok" ? "text-forest-700" : "text-red-600"}`}>{message.text}</p>
        ) : null}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="glass-btn-primary rounded-full px-7 py-3 text-sm font-semibold text-sand-50 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save card"}
        </button>
      </div>

      <div className="card h-fit space-y-3 p-6">
        <p className="muted">Preview</p>
        <div className="designer-card designer-card--static">
          <div className="designer-card__photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shownPhoto} alt="" />
          </div>
          <div className="designer-card__text">
            <p className="designer-card__name">{card.name}</p>
            <p className="designer-card__role">{card.roleEn}</p>
            <p className="designer-card__about">{card.aboutEn}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
