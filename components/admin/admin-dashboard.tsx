"use client";

import {FormEvent, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {submitFormData} from "@/lib/xhr-form-submit";
import {AdminBodyShape, BodyShapeFormState, buildBodyShapeFormData, emptyBodyShapeForm, formFromBodyShape} from "./body-shape-types";
import {BodyShapeForm} from "./body-shape-form";
import {isValidHex} from "./colour-options-editor";
import {DashboardHome} from "./dashboard-home";
import {AdminHeroCard, HeroCardFormState, buildHeroCardFormData, emptyHeroCardForm} from "./hero-card-types";
import {HeroCardForm} from "./hero-card-form";
import {ManageBodyShapesPanel} from "./manage-body-shapes-panel";
import {ManageHeroCardsPanel} from "./manage-hero-cards-panel";
import {ManageProductsPanel} from "./manage-products-panel";
import {ProductForm} from "./product-form";
import {Toast, ToastState} from "./toast";
import {AdminProduct, ProductFormState, buildFormData, emptyForm, formFromProduct} from "./types";
import {useConfirm} from "./use-confirm";

type Tab =
  | "dashboard"
  | "add"
  | "manage"
  | "add-hero-card"
  | "manage-hero-cards"
  | "add-body-shape"
  | "manage-body-shapes"
  | "edit-body-shape";

const validTabs: Tab[] = [
  "dashboard",
  "add",
  "manage",
  "add-hero-card",
  "manage-hero-cards",
  "add-body-shape",
  "manage-body-shapes",
  "edit-body-shape"
];

function tabFromParam(value: string | null): Tab {
  return validTabs.includes(value as Tab) ? (value as Tab) : "dashboard";
}

// Shared by the create and edit submit handlers below - a hex code never
// reaches the server unvalidated, but checking here too means the admin
// sees the problem immediately instead of after a round trip.
function validateColourOptions(form: ProductFormState): string | null {
  const groups: Array<{enabled: boolean; options: ProductFormState["baseColourOptions"]; name: string}> = [
    {enabled: form.hasBaseColour, options: form.baseColourOptions, name: "base colour"},
    {enabled: form.hasHandleColour, options: form.handleColourOptions, name: "handle colour"}
  ];
  for (const group of groups) {
    if (!group.enabled) continue;
    if (!group.options.length) {
      return `Add at least one ${group.name} option, or turn it off.`;
    }
    for (const option of group.options) {
      if (!option.label.trim()) {
        return `Every ${group.name} option needs a name.`;
      }
      if (!isValidHex(option.hex)) {
        return `"${option.label || option.hex}" needs a valid hex code, e.g. #B7924B.`;
      }
    }
  }
  return null;
}

export function AdminDashboard({userEmail, userName}: {userEmail: string; userName?: string | null}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));
  const {confirm, dialog: confirmDialog} = useConfirm();

  function setTab(next: Tab) {
    router.replace(next === "dashboard" ? "/mimin" : `/mimin?tab=${next}`, {scroll: false});
  }

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<ProductFormState>(emptyForm());
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>(emptyForm());
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editProgress, setEditProgress] = useState<number | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const [heroCards, setHeroCards] = useState<AdminHeroCard[]>([]);
  const [loadingHeroCards, setLoadingHeroCards] = useState(true);
  const [busyHeroCardId, setBusyHeroCardId] = useState<string | null>(null);

  const [createHeroCardForm, setCreateHeroCardForm] = useState<HeroCardFormState>(emptyHeroCardForm());
  const [creatingHeroCard, setCreatingHeroCard] = useState(false);
  const [createHeroCardProgress, setCreateHeroCardProgress] = useState<number | null>(null);
  const [createHeroCardError, setCreateHeroCardError] = useState<string | null>(null);

  const [bodyShapes, setBodyShapes] = useState<AdminBodyShape[]>([]);
  const [loadingBodyShapes, setLoadingBodyShapes] = useState(true);
  const [busyBodyShapeId, setBusyBodyShapeId] = useState<string | null>(null);

  const [createBodyShapeForm, setCreateBodyShapeForm] = useState<BodyShapeFormState>(emptyBodyShapeForm());
  const [creatingBodyShape, setCreatingBodyShape] = useState(false);
  const [createBodyShapeError, setCreateBodyShapeError] = useState<string | null>(null);

  const [editingBodyShape, setEditingBodyShape] = useState<AdminBodyShape | null>(null);
  const [editBodyShapeForm, setEditBodyShapeForm] = useState<BodyShapeFormState>(emptyBodyShapeForm());
  const [editBodyShapeSubmitting, setEditBodyShapeSubmitting] = useState(false);
  const [editBodyShapeError, setEditBodyShapeError] = useState<string | null>(null);

  async function loadProducts() {
    setLoadingList(true);
    try {
      const response = await fetch("/api/admin/products?scope=all", {cache: "no-store"});
      const data: unknown = response.ok ? await response.json().catch(() => []) : [];
      setProducts(Array.isArray(data) ? (data as AdminProduct[]) : []);
    } finally {
      setLoadingList(false);
    }
  }

  async function loadHeroCards() {
    setLoadingHeroCards(true);
    try {
      const response = await fetch("/api/admin/hero-cards?scope=all", {cache: "no-store"});
      const data: unknown = response.ok ? await response.json().catch(() => []) : [];
      setHeroCards(Array.isArray(data) ? (data as AdminHeroCard[]) : []);
    } finally {
      setLoadingHeroCards(false);
    }
  }

  async function loadBodyShapes() {
    setLoadingBodyShapes(true);
    try {
      const response = await fetch("/api/admin/body-shapes", {cache: "no-store"});
      const data: unknown = response.ok ? await response.json().catch(() => []) : [];
      setBodyShapes(Array.isArray(data) ? (data as AdminBodyShape[]) : []);
    } finally {
      setLoadingBodyShapes(false);
    }
  }

  useEffect(() => {
    loadProducts();
    loadHeroCards();
    loadBodyShapes();
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setCreateError(null);

    if (!createForm.images.length) {
      setCreateError("Please choose at least one image.");
      return;
    }
    if (!createForm.materials.length) {
      setCreateError("Pick at least one material.");
      return;
    }
    const colourError = validateColourOptions(createForm);
    if (colourError) {
      setCreateError(colourError);
      return;
    }

    setCreating(true);
    setCreateProgress(0);
    try {
      const result = await submitFormData("/api/admin/products", "POST", buildFormData(createForm), setCreateProgress);
      if (!result.ok) {
        setCreateError(result.data?.error ?? "Could not save product.");
        return;
      }
      // Post-save: clear the form and hand off to Manage Products so the
      // admin can see the new listing land, rather than leaving them
      // staring at an already-submitted form.
      setCreateForm(emptyForm());
      setToast({type: "success", message: `"${result.data?.name ?? "Product"}" was added.`});
      await loadProducts();
      setTab("manage");
    } catch {
      setCreateError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setCreating(false);
      setCreateProgress(null);
    }
  }

  function startEdit(product: AdminProduct) {
    setEditingProduct(product);
    setEditForm(formFromProduct(product));
    setEditError(null);
    setTab("add");
  }

  // Clones the product currently being edited into a fresh, unsaved create
  // draft  -  images/name are left for the admin to change (a literal copy
  // of both would collide on the unique slug/name-derived-slug anyway), a
  // useful starting point is enough.
  function duplicateEditingProduct() {
    if (!editingProduct) return;
    setCreateForm({...editForm, name: `${editForm.name} (copy)`});
    setEditingProduct(null);
    setEditError(null);
    setTab("add");
  }

  const editingIndex = editingProduct ? products.findIndex((product) => product.slug === editingProduct.slug) : -1;

  function navigateEdit(direction: -1 | 1) {
    if (editingIndex === -1) return;
    const next = products[editingIndex + direction];
    if (next) {
      startEdit(next);
    }
  }

  const [previewing, setPreviewing] = useState(false);

  // Stages the edit form's current (possibly unsaved) state as a draft,
  // then opens the admin-only preview route. The tab is opened
  // synchronously, before the await, and only pointed at the real URL once
  // the draft save resolves - opening it after an await would make most
  // browsers treat it as a popup and block it, since by then it's no
  // longer inside the original click's call stack.
  async function previewEditingProduct() {
    if (!editingProduct || previewing) return;
    const tab = window.open("", "_blank");
    setPreviewing(true);
    try {
      const response = await fetch(`/api/admin/products?slug=${encodeURIComponent(editingProduct.slug)}&action=draft`, {
        method: "PATCH",
        body: buildFormData(editForm)
      });
      if (!response.ok) {
        tab?.close();
        setToast({type: "error", message: "Could not stage the preview."});
        return;
      }
      if (tab) {
        tab.location.href = `/catalogue/${editingProduct.slug}?preview=1`;
      }
    } catch {
      tab?.close();
      setToast({type: "error", message: "Could not reach the server. Please check your connection and try again."});
    } finally {
      setPreviewing(false);
    }
  }

  function cancelEdit() {
    setEditingProduct(null);
    setEditError(null);
    setTab("manage");
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingProduct) {
      return;
    }
    setEditError(null);

    if (!editForm.materials.length) {
      setEditError("Pick at least one material.");
      return;
    }
    const colourError = validateColourOptions(editForm);
    if (colourError) {
      setEditError(colourError);
      return;
    }

    setEditSubmitting(true);
    setEditProgress(0);
    try {
      const result = await submitFormData(
        `/api/admin/products?slug=${encodeURIComponent(editingProduct.slug)}`,
        "PATCH",
        buildFormData(editForm),
        setEditProgress
      );
      if (!result.ok) {
        setEditError(result.data?.error ?? "Could not update product.");
        return;
      }
      setToast({type: "success", message: `"${result.data?.name ?? editingProduct.name}" was updated.`});
      setEditingProduct(null);
      await loadProducts();
      setTab("manage");
    } catch {
      setEditError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setEditSubmitting(false);
      setEditProgress(null);
    }
  }

  async function handleDeactivate(product: AdminProduct) {
    if (
      !(await confirm({
        title: `Deactivate "${product.name}"?`,
        description: "It will no longer show on the storefront until you reactivate it.",
        confirmLabel: "Deactivate"
      }))
    ) {
      return;
    }
    setBusySlug(product.slug);
    try {
      const response = await fetch(`/api/admin/products?slug=${encodeURIComponent(product.slug)}&action=deactivate`, {
        method: "PATCH"
      });
      if (!response.ok) {
        setToast({type: "error", message: "Could not deactivate the product."});
        return;
      }
      setToast({type: "success", message: `"${product.name}" was deactivated.`});
      await loadProducts();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleActivate(product: AdminProduct) {
    setBusySlug(product.slug);
    try {
      const response = await fetch(`/api/admin/products?slug=${encodeURIComponent(product.slug)}&action=activate`, {
        method: "PATCH"
      });
      if (!response.ok) {
        setToast({type: "error", message: "Could not reactivate the product."});
        return;
      }
      setToast({type: "success", message: `"${product.name}" is active again.`});
      await loadProducts();
    } finally {
      setBusySlug(null);
    }
  }

  // Batches the same per-slug PATCH/DELETE calls the single-row actions
  // already use, just with one confirm/toast/refresh for the whole
  // selection instead of one per row.
  async function handleBulkDeactivate(slugs: string[]) {
    if (!slugs.length) return;
    if (
      !(await confirm({
        title: `Deactivate ${slugs.length} product${slugs.length === 1 ? "" : "s"}?`,
        description: "They'll no longer show on the storefront until reactivated.",
        confirmLabel: "Deactivate"
      }))
    ) {
      return;
    }
    setBusySlug("bulk");
    try {
      await Promise.all(
        slugs.map((slug) => fetch(`/api/admin/products?slug=${encodeURIComponent(slug)}&action=deactivate`, {method: "PATCH"}))
      );
      setToast({type: "success", message: `${slugs.length} product${slugs.length === 1 ? "" : "s"} deactivated.`});
      await loadProducts();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleBulkActivate(slugs: string[]) {
    if (!slugs.length) return;
    setBusySlug("bulk");
    try {
      await Promise.all(
        slugs.map((slug) => fetch(`/api/admin/products?slug=${encodeURIComponent(slug)}&action=activate`, {method: "PATCH"}))
      );
      setToast({type: "success", message: `${slugs.length} product${slugs.length === 1 ? "" : "s"} activated.`});
      await loadProducts();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleBulkDelete(slugs: string[]) {
    if (!slugs.length) return;
    if (
      !(await confirm({
        title: `Delete ${slugs.length} product${slugs.length === 1 ? "" : "s"}?`,
        description: "This permanently removes them from the catalogue. This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger",
        requireText: String(slugs.length),
        requireTextLabel: `Type ${slugs.length} to confirm`
      }))
    ) {
      return;
    }
    setBusySlug("bulk");
    try {
      const response = await fetch("/api/admin/products/bulk-delete", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({slugs, confirmCount: slugs.length})
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast({type: "error", message: data?.error ?? "Could not delete the selected products."});
        return;
      }
      setToast({type: "success", message: `${slugs.length} product${slugs.length === 1 ? "" : "s"} deleted.`});
      await loadProducts();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleDeleteProduct(product: AdminProduct) {
    if (
      !(await confirm({
        title: `Delete "${product.name}"?`,
        description: "This permanently removes it from the catalogue. This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger",
        requireText: product.name,
        requireTextLabel: `Type "${product.name}" to confirm`
      }))
    ) {
      return;
    }
    setBusySlug(product.slug);
    try {
      const response = await fetch(
        `/api/admin/products?slug=${encodeURIComponent(product.slug)}&confirm=${encodeURIComponent(product.name)}`,
        {method: "DELETE"}
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast({type: "error", message: data?.error ?? "Could not delete the product."});
        return;
      }
      setToast({type: "success", message: `"${product.name}" was deleted.`});
      if (editingProduct?.slug === product.slug) {
        setEditingProduct(null);
        setTab("manage");
      }
      await loadProducts();
    } finally {
      setBusySlug(null);
    }
  }

  async function handleCreateHeroCard(event: FormEvent) {
    event.preventDefault();
    setCreateHeroCardError(null);

    if (createHeroCardForm.cardType === "image" && !createHeroCardForm.image.length) {
      setCreateHeroCardError("Please choose an image.");
      return;
    }

    setCreatingHeroCard(true);
    setCreateHeroCardProgress(0);
    try {
      const result = await submitFormData(
        "/api/admin/hero-cards",
        "POST",
        buildHeroCardFormData(createHeroCardForm),
        setCreateHeroCardProgress
      );
      if (!result.ok) {
        setCreateHeroCardError(result.data?.error ?? "Could not save hero card.");
        return;
      }
      setCreateHeroCardForm(emptyHeroCardForm());
      setToast({type: "success", message: "Hero card was added."});
      await loadHeroCards();
      setTab("manage-hero-cards");
    } catch {
      setCreateHeroCardError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setCreatingHeroCard(false);
      setCreateHeroCardProgress(null);
    }
  }

  async function handleDeleteHeroCard(card: AdminHeroCard) {
    if (
      !(await confirm({
        title: "Delete this hero card?",
        description: "This permanently removes it. This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger"
      }))
    ) {
      return;
    }
    setBusyHeroCardId(card.id);
    try {
      const response = await fetch(`/api/admin/hero-cards?id=${encodeURIComponent(card.id)}`, {method: "DELETE"});
      if (!response.ok) {
        setToast({type: "error", message: "Could not delete the hero card."});
        return;
      }
      setToast({type: "success", message: "Hero card was deleted."});
      await loadHeroCards();
    } finally {
      setBusyHeroCardId(null);
    }
  }

  async function handleReorderHeroCards(orderedIds: string[]) {
    try {
      const response = await fetch("/api/admin/hero-cards", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({order: orderedIds})
      });
      if (!response.ok) {
        setToast({type: "error", message: "Could not save the new order."});
        await loadHeroCards();
        return;
      }
      await loadHeroCards();
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please check your connection and try again."});
      await loadHeroCards();
    }
  }

  async function handleCreateBodyShape(event: FormEvent) {
    event.preventDefault();
    setCreateBodyShapeError(null);

    if (!createBodyShapeForm.name.trim()) {
      setCreateBodyShapeError("Name is required.");
      return;
    }

    setCreatingBodyShape(true);
    try {
      const response = await fetch("/api/admin/body-shapes", {
        method: "POST",
        body: buildBodyShapeFormData(createBodyShapeForm)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setCreateBodyShapeError(data?.error ?? "Could not save body shape.");
        return;
      }
      setCreateBodyShapeForm(emptyBodyShapeForm());
      setToast({type: "success", message: `"${data?.name ?? "Body shape"}" was added.`});
      await loadBodyShapes();
      setTab("manage-body-shapes");
    } catch {
      setCreateBodyShapeError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setCreatingBodyShape(false);
    }
  }

  function startEditBodyShape(shape: AdminBodyShape) {
    setEditingBodyShape(shape);
    setEditBodyShapeForm(formFromBodyShape(shape));
    setEditBodyShapeError(null);
    setTab("edit-body-shape");
  }

  function cancelEditBodyShape() {
    setEditingBodyShape(null);
    setEditBodyShapeError(null);
    setTab("manage-body-shapes");
  }

  async function handleEditBodyShapeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!editingBodyShape) {
      return;
    }
    setEditBodyShapeError(null);

    if (!editBodyShapeForm.name.trim()) {
      setEditBodyShapeError("Name is required.");
      return;
    }

    setEditBodyShapeSubmitting(true);
    try {
      const response = await fetch(`/api/admin/body-shapes?id=${encodeURIComponent(editingBodyShape.id)}`, {
        method: "PATCH",
        body: buildBodyShapeFormData(editBodyShapeForm)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setEditBodyShapeError(data?.error ?? "Could not update body shape.");
        return;
      }
      setToast({type: "success", message: `"${data?.name ?? editingBodyShape.name}" was updated.`});
      setEditingBodyShape(null);
      await loadBodyShapes();
      await loadProducts();
      setTab("manage-body-shapes");
    } catch {
      setEditBodyShapeError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setEditBodyShapeSubmitting(false);
    }
  }

  async function setBodyShapeArchived(shape: AdminBodyShape, archived: boolean) {
    setBusyBodyShapeId(shape.id);
    try {
      const response = await fetch(
        `/api/admin/body-shapes?id=${encodeURIComponent(shape.id)}&action=${archived ? "archive" : "unarchive"}`,
        {method: "PATCH"}
      );
      if (!response.ok) {
        setToast({type: "error", message: `Could not ${archived ? "archive" : "unarchive"} "${shape.name}".`});
        return;
      }
      setToast({type: "success", message: `"${shape.name}" was ${archived ? "archived" : "unarchived"}.`});
      await loadBodyShapes();
    } finally {
      setBusyBodyShapeId(null);
    }
  }

  const isEditing = Boolean(editingProduct);

  const pageTitles: Record<Tab, string> = {
    dashboard: "Dashboard",
    add: isEditing ? "Edit Product" : "Add Product",
    manage: "Manage Products",
    "add-hero-card": "Add Hero Card",
    "manage-hero-cards": "Manage Hero Cards",
    "add-body-shape": "Add Body Shape",
    "manage-body-shapes": "Manage Body Shapes",
    "edit-body-shape": "Edit Body Shape"
  };

  return (
    <div className="space-y-6">
      {tab !== "dashboard" && tab !== "add" ? (
        <div>
          <p className="muted">Admin, {userEmail}</p>
          <h1 className="mt-2 font-display text-3xl text-forest-900">{pageTitles[tab]}</h1>
        </div>
      ) : null}

      <div className="space-y-8">
        {tab === "dashboard" ? <DashboardHome userName={userName} onNavigate={setTab} /> : null}

        {tab === "add" ? (
          isEditing && editingProduct ? (
            <ProductForm
              mode="edit"
              form={editForm}
              onChange={setEditForm}
              onSubmit={handleEditSubmit}
              submitting={editSubmitting}
              errorMessage={editError}
              bodyShapes={bodyShapes}
              imageSlug={editingProduct.slug}
              onCancel={cancelEdit}
              product={editingProduct}
              onDeactivate={() => handleDeactivate(editingProduct)}
              onActivate={() => handleActivate(editingProduct)}
              onDelete={() => handleDeleteProduct(editingProduct)}
              onDuplicate={duplicateEditingProduct}
              onNavigate={navigateEdit}
              hasPrev={editingIndex > 0}
              hasNext={editingIndex !== -1 && editingIndex < products.length - 1}
              onPreview={() => void previewEditingProduct()}
              previewing={previewing}
            />
          ) : (
            <ProductForm
              mode="create"
              form={createForm}
              onChange={setCreateForm}
              onSubmit={handleCreate}
              submitting={creating}
              errorMessage={createError}
              bodyShapes={bodyShapes}
              imageSlug={createForm.name || "new-product"}
            />
          )
        ) : null}

        {tab === "manage" ? (
          <ManageProductsPanel
            products={products}
            loading={loadingList}
            onEdit={startEdit}
            onDeactivate={handleDeactivate}
            onActivate={handleActivate}
            onDelete={handleDeleteProduct}
            busySlug={busySlug}
            onBulkDeactivate={handleBulkDeactivate}
            onBulkActivate={handleBulkActivate}
            onBulkDelete={handleBulkDelete}
          />
        ) : null}

        {tab === "add-hero-card" ? (
          <HeroCardForm
            form={createHeroCardForm}
            onChange={setCreateHeroCardForm}
            onSubmit={handleCreateHeroCard}
            submitting={creatingHeroCard}
            uploadProgress={createHeroCardProgress}
            errorMessage={createHeroCardError}
          />
        ) : null}

        {tab === "manage-hero-cards" ? (
          <ManageHeroCardsPanel
            cards={heroCards}
            loading={loadingHeroCards}
            onDelete={handleDeleteHeroCard}
            onReorder={handleReorderHeroCards}
            busyId={busyHeroCardId}
          />
        ) : null}

        {tab === "add-body-shape" ? (
          <BodyShapeForm
            mode="create"
            form={createBodyShapeForm}
            onChange={setCreateBodyShapeForm}
            onSubmit={handleCreateBodyShape}
            submitting={creatingBodyShape}
            errorMessage={createBodyShapeError}
          />
        ) : null}

        {tab === "manage-body-shapes" ? (
          <ManageBodyShapesPanel
            shapes={bodyShapes}
            loading={loadingBodyShapes}
            onEdit={startEditBodyShape}
            onArchive={(shape) => setBodyShapeArchived(shape, true)}
            onUnarchive={(shape) => setBodyShapeArchived(shape, false)}
            busyId={busyBodyShapeId}
          />
        ) : null}

        {tab === "edit-body-shape" && editingBodyShape ? (
          <BodyShapeForm
            mode="edit"
            form={editBodyShapeForm}
            onChange={setEditBodyShapeForm}
            onSubmit={handleEditBodyShapeSubmit}
            submitting={editBodyShapeSubmitting}
            errorMessage={editBodyShapeError}
            onCancel={cancelEditBodyShape}
          />
        ) : null}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
      {confirmDialog}
    </div>
  );
}
