"use client";

import {FormEvent, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {signOut} from "next-auth/react";
import {submitFormData} from "@/lib/xhr-form-submit";
import {DashboardHome} from "./dashboard-home";
import {AdminHeroCard, HeroCardFormState, buildHeroCardFormData, emptyHeroCardForm} from "./hero-card-types";
import {HeroCardForm} from "./hero-card-form";
import {ManageHeroCardsPanel} from "./manage-hero-cards-panel";
import {ManageProductsPanel} from "./manage-products-panel";
import {ProductForm} from "./product-form";
import {Toast, ToastState} from "./toast";
import {AdminProduct, ProductFormState, buildFormData, emptyForm, formFromProduct} from "./types";

type Tab = "dashboard" | "add" | "manage" | "add-hero-card" | "manage-hero-cards";

const validTabs: Tab[] = ["dashboard", "add", "manage", "add-hero-card", "manage-hero-cards"];

function tabFromParam(value: string | null): Tab {
  return validTabs.includes(value as Tab) ? (value as Tab) : "dashboard";
}

export function AdminDashboard({userEmail}: {userEmail: string}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));

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

  useEffect(() => {
    loadProducts();
    loadHeroCards();
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
    if (!window.confirm(`Deactivate "${product.name}"? It will be hidden from the storefront until reactivated.`)) {
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
    if (!window.confirm("Permanently delete this hero card? This cannot be undone.")) {
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

  async function handleReorderHeroCard(card: AdminHeroCard, direction: "up" | "down") {
    setBusyHeroCardId(card.id);
    try {
      const response = await fetch(`/api/admin/hero-cards?id=${encodeURIComponent(card.id)}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({direction})
      });
      if (!response.ok) {
        setToast({type: "error", message: "Could not reorder the hero card."});
        return;
      }
      await loadHeroCards();
    } finally {
      setBusyHeroCardId(null);
    }
  }

  async function handleLogout() {
    await signOut({callbackUrl: "/mimin"});
  }

  const isEditing = Boolean(editingProduct);

  const pageTitles: Record<Tab, string> = {
    dashboard: "Dashboard",
    add: isEditing ? "Edit Product" : "Add Product",
    manage: "Manage Products",
    "add-hero-card": "Add Hero Card",
    "manage-hero-cards": "Manage Hero Cards"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="muted">Admin, {userEmail}</p>
          <h1 className="mt-2 font-display text-3xl text-forest-900">{pageTitles[tab]}</h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="button-lift rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-5 py-2 text-sm text-forest-700"
        >
          Sign out
        </button>
      </div>

      <div className="space-y-8">
        {tab === "dashboard" ? <DashboardHome onNavigate={setTab} /> : null}

          {tab === "add" ? (
            isEditing && editingProduct ? (
              <ProductForm
                mode="edit"
                form={editForm}
                onChange={setEditForm}
                onSubmit={handleEditSubmit}
                submitting={editSubmitting}
                uploadProgress={editProgress}
                errorMessage={editError}
                existingImages={editingProduct.images}
                onCancel={cancelEdit}
              />
            ) : (
              <ProductForm
                mode="create"
                form={createForm}
                onChange={setCreateForm}
                onSubmit={handleCreate}
                submitting={creating}
                uploadProgress={createProgress}
                errorMessage={createError}
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
              busySlug={busySlug}
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
              onReorder={handleReorderHeroCard}
              busyId={busyHeroCardId}
            />
          ) : null}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
