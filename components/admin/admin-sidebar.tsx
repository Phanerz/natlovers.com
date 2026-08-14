"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {ChevronDown, GalleryHorizontal, LayoutDashboard, PlusCircle, Receipt, ShoppingBag} from "lucide-react";
import {ShopProductType, productTypeLabels, shopProductTypes} from "@/app/catalogue/shop-data";

type Tab = "dashboard" | "add" | "manage" | "add-hero-card" | "manage-hero-cards";

// Typography/spacing lifted directly from app/catalogue/filter-sidebar.tsx's
// FilterSection — same uppercase tracked label, same border-b rhythm
// between groups — so the admin shell reads as the same design system as
// the public catalogue's own sidebar, not a separate admin template.
function SectionLabel({children}: {children: React.ReactNode}) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e2e28]">{children}</span>;
}

function NavRow({active, onClick, icon: Icon, children}: {active: boolean; onClick: () => void; icon: typeof LayoutDashboard; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-150 ${
        active ? "bg-forest-900 text-sand-50" : "text-[#3c3c34] hover:bg-[#eee7d8] hover:text-[#344332]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}

function AddButton({active, onClick, label}: {active: boolean; onClick: () => void; label: string}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ${
        active ? "bg-forest-900 text-sand-50" : "text-[#a39d8d] hover:bg-[#eee7d8] hover:text-[#344332]"
      }`}
    >
      <PlusCircle className="h-4 w-4" />
    </button>
  );
}

function SubItem({label, active, onClick}: {label: string; active: boolean; onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-left text-[13px] transition-colors duration-150 ${
        active ? "font-medium text-forest-900" : "text-[#6b6b5f] hover:text-[#344332]"
      }`}
    >
      <span className={`h-1 w-1 rounded-full ${active ? "bg-forest-900" : "bg-transparent"}`} />
      {label}
    </button>
  );
}

type TypeFilter = "all" | ShopProductType;

export function AdminSidebar({
  tab,
  onTabChange,
  selectedType,
  onSelectType
}: {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  selectedType: TypeFilter;
  onSelectType: (type: TypeFilter) => void;
}) {
  const [ordersAwaiting, setOrdersAwaiting] = useState<number | null>(null);
  const [productsExpanded, setProductsExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard-stats", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {ordersAwaitingTransfer?: number} | null) => {
        if (!cancelled && data) {
          setOrdersAwaiting(data.ordersAwaitingTransfer ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="w-full shrink-0 rounded-[1.75rem] border border-[#d4c5ab] bg-[#fffaf1] p-4 lg:w-64">
      <div className="border-b border-[#d9cfc0] pb-3">
        <NavRow active={tab === "dashboard"} onClick={() => onTabChange("dashboard")} icon={LayoutDashboard}>
          Dashboard
        </NavRow>
      </div>

      <div className="border-b border-[#d9cfc0] py-3">
        <div className="px-3 pb-2">
          <SectionLabel>Catalogue</SectionLabel>
        </div>
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  onTabChange("manage");
                  onSelectType("all");
                  setProductsExpanded(true);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors duration-150 ${
                  tab === "manage" ? "bg-forest-900 text-sand-50" : "text-[#3c3c34] hover:bg-[#eee7d8] hover:text-[#344332]"
                }`}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className="flex-1">Manage Products</span>
                <ChevronDown
                  onClick={(event) => {
                    event.stopPropagation();
                    setProductsExpanded((value) => !value);
                  }}
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${productsExpanded ? "" : "-rotate-90"}`}
                />
              </button>
            </div>
            <AddButton active={tab === "add"} onClick={() => onTabChange("add")} label="Add product" />
          </div>

          {productsExpanded ? (
            <div className="space-y-0.5 pt-0.5">
              <SubItem
                label="All Products"
                active={tab === "manage" && selectedType === "all"}
                onClick={() => {
                  onTabChange("manage");
                  onSelectType("all");
                }}
              />
              {shopProductTypes.map((type: ShopProductType) => (
                <SubItem
                  key={type}
                  label={productTypeLabels[type].en}
                  active={tab === "manage" && selectedType === type}
                  onClick={() => {
                    onTabChange("manage");
                    onSelectType(type);
                  }}
                />
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <NavRow active={tab === "manage-hero-cards"} onClick={() => onTabChange("manage-hero-cards")} icon={GalleryHorizontal}>
                Hero Cards
              </NavRow>
            </div>
            <AddButton active={tab === "add-hero-card"} onClick={() => onTabChange("add-hero-card")} label="Add hero card" />
          </div>
        </div>
      </div>

      <div className="pt-3">
        <div className="px-3 pb-2">
          <SectionLabel>Orders</SectionLabel>
        </div>
        <Link
          href="/mimin/orders"
          className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-[#3c3c34] transition-colors duration-150 hover:bg-[#eee7d8] hover:text-[#344332]"
        >
          <span className="flex items-center gap-2.5">
            <Receipt className="h-4 w-4 shrink-0" />
            Orders
          </span>
          {ordersAwaiting ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#a4402b] px-1.5 text-[11px] font-semibold text-white">
              {ordersAwaiting}
            </span>
          ) : null}
        </Link>
      </div>
    </aside>
  );
}

export type {Tab as AdminTab};
