"use client";

import Image from "next/image";
import {Reorder, useDragControls} from "framer-motion";
import {FormEvent, useCallback, useEffect, useRef, useState} from "react";
import {GripVertical, Pencil, Plus, Trash2, X} from "lucide-react";
import {CatalogueBanner} from "@/app/catalogue/catalogue-banner";
import {productTypeLabels, shopProductTypes, type ShopProductType} from "@/app/catalogue/shop-data";
import {
  AdminBanner,
  BannerOverlay,
  DesktopSpan,
  MobileSpan,
  bannerOverlayLabels,
  bannerOverlays,
  desktopSpanLabels,
  desktopSpans,
  isSafeBannerDestination,
  mobileSpanLabels,
  mobileSpans
} from "@/lib/catalogue-banners";
import {GlassToggle} from "./glass-toggle";
import {HeroImageDropzone} from "./hero-image-dropzone";
import {PillOption} from "./pill-select";
import {SelectField} from "./select-field";
import {Toast, ToastState} from "./toast";
import {useConfirm} from "./use-confirm";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

// The image is bundled into the form submission, and the platform rejects a
// request body over ~4.5MB, so stay safely under that here.
const MAX_BANNER_IMAGE_BYTES = 4 * 1024 * 1024;
const MIN_BANNER_WIDTH = 1000;
const MIN_BANNER_HEIGHT = 500;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type FormState = {
  id: string | null;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  destinationUrl: string;
  isActive: boolean;
  category: ShopProductType | "";
  insertAfter: string;
  desktopSpan: DesktopSpan;
  mobileSpan: MobileSpan;
  overlay: BannerOverlay;
  image: File[];
  currentImageUrl: string | null;
};

function emptyForm(): FormState {
  return {
    id: null,
    eyebrow: "",
    title: "",
    description: "",
    ctaLabel: "",
    destinationUrl: "",
    isActive: true,
    category: "",
    insertAfter: "6",
    desktopSpan: "2x1",
    mobileSpan: "full",
    overlay: "dark",
    image: [],
    currentImageUrl: null
  };
}

function formFromBanner(banner: AdminBanner): FormState {
  return {
    id: banner.id,
    eyebrow: banner.eyebrow ?? "",
    title: banner.title,
    description: banner.description ?? "",
    ctaLabel: banner.ctaLabel ?? "",
    destinationUrl: banner.destinationUrl ?? "",
    isActive: banner.isActive,
    category: banner.category ?? "",
    insertAfter: String(banner.insertAfter),
    desktopSpan: banner.desktopSpan,
    mobileSpan: banner.mobileSpan,
    overlay: banner.overlay,
    image: [],
    currentImageUrl: banner.imageUrl
  };
}

function readImageSize(file: File): Promise<{width: number; height: number}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({width: image.naturalWidth, height: image.naturalHeight});
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be read as an image."));
    };
    image.src = url;
  });
}

async function validateImage(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "The banner image must be a JPG, PNG or WEBP file.";
  }
  if (file.size > MAX_BANNER_IMAGE_BYTES) {
    return "The banner image must be 4 MB or smaller.";
  }
  try {
    const {width, height} = await readImageSize(file);
    if (width < MIN_BANNER_WIDTH || height < MIN_BANNER_HEIGHT) {
      return `The banner image should be at least ${MIN_BANNER_WIDTH} × ${MIN_BANNER_HEIGHT}px (this one is ${width} × ${height}px).`;
    }
  } catch (error) {
    return error instanceof Error ? error.message : "That file couldn't be read as an image.";
  }
  return null;
}

function buildFormData(form: FormState) {
  const formData = new FormData();
  formData.set("eyebrow", form.eyebrow);
  formData.set("title", form.title);
  formData.set("description", form.description);
  formData.set("ctaLabel", form.ctaLabel);
  formData.set("destinationUrl", form.destinationUrl);
  formData.set("isActive", String(form.isActive));
  formData.set("category", form.category);
  formData.set("insertAfter", form.insertAfter);
  formData.set("desktopSpan", form.desktopSpan);
  formData.set("mobileSpan", form.mobileSpan);
  formData.set("overlay", form.overlay);
  if (form.image[0]) formData.set("image", form.image[0]);
  return formData;
}

function describe(banner: AdminBanner): string {
  const where = banner.insertAfter === 0 ? "Before the first product" : `After product ${banner.insertAfter}`;
  const span = banner.desktopSpan === "full" ? "full width" : banner.desktopSpan.replace("x", " × ");
  const category = banner.category ? productTypeLabels[banner.category].en : "All categories";
  return `${where} · ${span} · ${category}`;
}

function BannerRow({
  banner,
  busy,
  onEdit,
  onDelete,
  onToggle,
  onDragEnd
}: {
  banner: AdminBanner;
  busy: boolean;
  onEdit: (banner: AdminBanner) => void;
  onDelete: (banner: AdminBanner) => void;
  onToggle: (banner: AdminBanner, isActive: boolean) => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={banner}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e7ddc6] bg-[#fffdf9] p-4"
      whileDrag={{boxShadow: "0 14px 32px rgba(23,32,21,0.18)", scale: 1.01}}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        onPointerDown={(event) => dragControls.start(event)}
        className="glass-icon-btn flex aspect-square h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full text-forest-500 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-[#d9ccb3] bg-[#f2ecdc]">
        <Image src={banner.imageUrl} alt="" fill sizes="96px" className="object-cover" />
      </div>

      <div className="min-w-[12rem] flex-1">
        <p className="font-display text-base text-forest-900">{banner.title}</p>
        <p className="text-sm text-forest-600">{describe(banner)}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-forest-500">{banner.isActive ? "Live" : "Off"}</span>
        <GlassToggle
          size="sm"
          checked={banner.isActive}
          onChange={(checked) => onToggle(banner, checked)}
          label={banner.isActive ? "Switch banner off" : "Switch banner on"}
        />
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => onEdit(banner)}
        aria-label="Edit banner"
        className="glass-icon-btn flex aspect-square h-9 w-9 items-center justify-center rounded-full text-forest-700 disabled:opacity-50"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onDelete(banner)}
        aria-label="Delete banner"
        className="glass-icon-btn is-danger flex aspect-square h-9 w-9 items-center justify-center rounded-full text-red-600 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </Reorder.Item>
  );
}

export function ManageBannersPanel() {
  const {confirm, dialog} = useConfirm();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [order, setOrder] = useState<AdminBanner[]>([]);
  const orderRef = useRef(order);
  orderRef.current = order;

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/banners?scope=all", {cache: "no-store"});
      if (response.ok) {
        const data = (await response.json()) as AdminBanner[];
        setBanners(data);
        setOrder([...data].sort((a, b) => a.displayOrder - b.displayOrder));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A picked file previews instantly, before it is uploaded.
  useEffect(() => {
    const file = form?.image[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form?.image]);

  function notify(type: "success" | "error", message: string) {
    setToast({type, message});
    window.setTimeout(() => setToast(null), 4000);
  }

  async function handleFiles(files: File[]) {
    if (!form) return;
    const file = files[0];
    if (!file) {
      setForm({...form, image: []});
      return;
    }
    const problem = await validateImage(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setForm((current) => (current ? {...current, image: [file]} : current));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;

    if (!form.title.trim()) return setError("A title is required.");
    if (!form.id && form.image.length === 0) return setError("A banner image is required.");
    if (form.destinationUrl.trim() && !isSafeBannerDestination(form.destinationUrl.trim())) {
      return setError("The destination must be a path on this site (starting with /) or an https:// link.");
    }
    if (form.ctaLabel.trim() && !form.destinationUrl.trim()) return setError("A button label needs a destination.");
    const insertAfter = Number(form.insertAfter);
    if (!Number.isInteger(insertAfter) || insertAfter < 0 || insertAfter > 500) {
      return setError("Insert after must be a whole number from 0 to 500.");
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(form.id ? `/api/admin/banners?id=${encodeURIComponent(form.id)}` : "/api/admin/banners", {
        method: form.id ? "PUT" : "POST",
        body: buildFormData(form)
      });
      const result = (await response.json().catch(() => null)) as {error?: string} | null;
      if (!response.ok) {
        setError(result?.error ?? "Could not save the banner.");
        return;
      }
      notify("success", form.id ? "Banner updated." : "Banner created.");
      setForm(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(banner: AdminBanner) {
    const ok = await confirm({
      title: "Delete this banner?",
      description: `"${banner.title}" will be removed from the catalogue for good.`,
      confirmLabel: "Delete",
      tone: "danger"
    });
    if (!ok) return;
    setBusyId(banner.id);
    const response = await fetch(`/api/admin/banners?id=${encodeURIComponent(banner.id)}`, {method: "DELETE"});
    setBusyId(null);
    if (!response.ok) return notify("error", "Could not delete the banner.");
    notify("success", "Banner deleted.");
    await load();
  }

  async function handleToggle(banner: AdminBanner, isActive: boolean) {
    setBanners((current) => current.map((item) => (item.id === banner.id ? {...item, isActive} : item)));
    setOrder((current) => current.map((item) => (item.id === banner.id ? {...item, isActive} : item)));
    const response = await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({id: banner.id, isActive})
    });
    if (!response.ok) {
      notify("error", "Could not change the banner.");
      await load();
    }
  }

  async function persistOrder() {
    const response = await fetch("/api/admin/banners", {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({order: orderRef.current.map((item) => item.id)})
    });
    if (!response.ok) {
      notify("error", "Could not save the new order.");
      await load();
    }
  }

  const previewBanner = form
    ? {
        eyebrow: form.eyebrow.trim() || null,
        title: form.title.trim() || "Collection title",
        description: form.description.trim() || null,
        imageUrl: form.currentImageUrl ?? "",
        ctaLabel: form.ctaLabel.trim() || null,
        destinationUrl: form.destinationUrl.trim() || null,
        overlay: form.overlay
      }
    : null;
  const previewImage = previewUrl ?? form?.currentImageUrl ?? null;

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3 border-b border-[#eadfc9] pb-4">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-forest-900">Editorial Banners ({order.length})</h2>
            <p className="text-xs text-forest-500">
              Collection features shown between products in the catalogue. Drag to reorder; banners that share an
              insertion point appear in this order.
            </p>
          </div>
          {!form ? (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setForm(emptyForm());
              }}
              className="glass-btn-primary flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-sand-50"
            >
              <Plus className="h-4 w-4" />
              New banner
            </button>
          ) : null}
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-forest-600">Loading banners...</p>
        ) : order.length ? (
          <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-3">
            {order.map((banner) => (
              <BannerRow
                key={banner.id}
                banner={banner}
                busy={busyId === banner.id}
                onEdit={(item) => {
                  setError(null);
                  setForm(formFromBanner(item));
                }}
                onDelete={handleDelete}
                onToggle={handleToggle}
                onDragEnd={persistOrder}
              />
            ))}
          </Reorder.Group>
        ) : (
          <p className="py-10 text-center text-sm text-forest-600">No banners yet. Create one to feature a collection.</p>
        )}
      </div>

      {form && previewBanner ? (
        <form onSubmit={handleSubmit} className="card space-y-6 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3 border-b border-[#eadfc9] pb-4">
            <h2 className="font-display text-xl text-forest-900">{form.id ? "Edit banner" : "New banner"}</h2>
            <button
              type="button"
              onClick={() => setForm(null)}
              aria-label="Close editor"
              className="glass-icon-btn flex aspect-square h-9 w-9 items-center justify-center rounded-full text-forest-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              <label className="block space-y-2 text-sm text-forest-700">
                <span className="muted">Small label (optional)</span>
                <input
                  value={form.eyebrow}
                  maxLength={48}
                  onChange={(event) => setForm({...form, eyebrow: event.target.value})}
                  placeholder="e.g. The Garden Collection"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2 text-sm text-forest-700">
                <span className="muted">Title</span>
                <input
                  value={form.title}
                  maxLength={80}
                  onChange={(event) => setForm({...form, title: event.target.value})}
                  placeholder="e.g. Kebun Bunga"
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2 text-sm text-forest-700">
                <span className="muted">Description (optional)</span>
                <textarea
                  value={form.description}
                  maxLength={240}
                  rows={3}
                  onChange={(event) => setForm({...form, description: event.target.value})}
                  placeholder="One or two lines about the collection"
                  className={fieldClass}
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2 text-sm text-forest-700">
                  <span className="muted">Button label (optional)</span>
                  <input
                    value={form.ctaLabel}
                    maxLength={30}
                    onChange={(event) => setForm({...form, ctaLabel: event.target.value})}
                    placeholder="e.g. Discover"
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2 text-sm text-forest-700">
                  <span className="muted">Destination (optional)</span>
                  <input
                    value={form.destinationUrl}
                    onChange={(event) => setForm({...form, destinationUrl: event.target.value})}
                    placeholder="/catalogue?type=Bags or https://..."
                    className={fieldClass}
                  />
                </label>
              </div>

              <HeroImageDropzone files={form.image} onFilesChange={(files) => void handleFiles(files)} />
              <p className="-mt-2 text-xs text-forest-500">
                JPG, PNG or WEBP, at least {MIN_BANNER_WIDTH} × {MIN_BANNER_HEIGHT}px and up to 4 MB.
                {form.id ? " Leave empty to keep the current image." : ""}
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2 text-sm text-forest-700">
                  <span className="muted">Insert after (products)</span>
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={form.insertAfter}
                    onChange={(event) => setForm({...form, insertAfter: event.target.value})}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2 text-sm text-forest-700">
                  <span className="muted">Category</span>
                  <SelectField value={form.category} onChange={(value) => setForm({...form, category: value as ShopProductType | ""})}>
                    <option value="">All categories</option>
                    {shopProductTypes.map((type) => (
                      <option key={type} value={type}>
                        {productTypeLabels[type].en}
                      </option>
                    ))}
                  </SelectField>
                </label>
              </div>

              <div className="space-y-2">
                <span className="muted">Desktop size</span>
                <div className="flex flex-wrap gap-2.5">
                  {desktopSpans.map((span) => (
                    <PillOption
                      key={span}
                      label={desktopSpanLabels[span]}
                      active={form.desktopSpan === span}
                      onClick={() => setForm({...form, desktopSpan: span})}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="muted">Mobile size</span>
                <div className="flex flex-wrap gap-2.5">
                  {mobileSpans.map((span) => (
                    <PillOption
                      key={span}
                      label={mobileSpanLabels[span]}
                      active={form.mobileSpan === span}
                      onClick={() => setForm({...form, mobileSpan: span})}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="muted">Text over image</span>
                <div className="flex flex-wrap gap-2.5">
                  {bannerOverlays.map((overlay) => (
                    <PillOption
                      key={overlay}
                      label={bannerOverlayLabels[overlay]}
                      active={form.overlay === overlay}
                      onClick={() => setForm({...form, overlay})}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between gap-3 text-sm text-forest-700">
                <span>Show this banner in the catalogue</span>
                <GlassToggle checked={form.isActive} onChange={(isActive) => setForm({...form, isActive})} label="Banner is live" />
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="muted">Preview</span>
              <div className="flex gap-2">
                {(["desktop", "mobile"] as const).map((mode) => (
                  <PillOption key={mode} label={mode === "desktop" ? "Desktop" : "Mobile"} active={previewMode === mode} onClick={() => setPreviewMode(mode)} />
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-[#f7f4ee] p-4">
              {previewMode === "desktop" ? (
                <div className="mx-auto" style={{maxWidth: 640, aspectRatio: "2.1 / 1"}}>
                  <CatalogueBanner banner={previewBanner} imageOverride={previewImage} layout="grid" />
                </div>
              ) : (
                <div className="mx-auto" style={{maxWidth: 360}}>
                  <CatalogueBanner
                    banner={previewBanner}
                    imageOverride={previewImage}
                    layout={form.mobileSpan === "full" ? "feature" : "feature-narrow"}
                  />
                </div>
              )}
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="glass-btn-primary flex-1 rounded-full px-6 py-4 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : form.id ? "Save changes" : "Create banner"}
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-6 py-4 text-base font-medium text-forest-700"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {dialog}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
