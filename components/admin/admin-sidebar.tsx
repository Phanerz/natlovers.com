"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {GalleryHorizontal, LayoutDashboard, MessageSquareQuote, PlusCircle, Receipt, ShoppingBag} from "lucide-react";

type Tab = "dashboard" | "add" | "manage" | "add-testimonial" | "manage-testimonials" | "add-hero-card" | "manage-hero-cards";

function NavButton({active, onClick, icon: Icon, children}: {active: boolean; onClick: () => void; icon: typeof LayoutDashboard; children: React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
        active ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-[#f0e7d4]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </button>
  );
}

function SectionLabel({children}: {children: React.ReactNode}) {
  return <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-forest-500">{children}</p>;
}

export function AdminSidebar({tab, onTabChange}: {tab: Tab; onTabChange: (tab: Tab) => void}) {
  const [ordersAwaiting, setOrdersAwaiting] = useState<number | null>(null);

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
    <aside className="w-56 shrink-0 space-y-1 rounded-[1.4rem] border border-[#d4c5ab] bg-[#fffaf1] p-3">
      <NavButton active={tab === "dashboard"} onClick={() => onTabChange("dashboard")} icon={LayoutDashboard}>
        Dashboard
      </NavButton>

      <SectionLabel>Catalogue</SectionLabel>
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <NavButton active={tab === "manage"} onClick={() => onTabChange("manage")} icon={ShoppingBag}>
            Products
          </NavButton>
        </div>
        <button
          type="button"
          aria-label="Add product"
          onClick={() => onTabChange("add")}
          className={`icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            tab === "add" ? "bg-forest-900 text-sand-50" : "text-forest-600 hover:bg-[#f0e7d4]"
          }`}
        >
          <PlusCircle className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <NavButton active={tab === "manage-hero-cards"} onClick={() => onTabChange("manage-hero-cards")} icon={GalleryHorizontal}>
            Hero Cards
          </NavButton>
        </div>
        <button
          type="button"
          aria-label="Add hero card"
          onClick={() => onTabChange("add-hero-card")}
          className={`icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            tab === "add-hero-card" ? "bg-forest-900 text-sand-50" : "text-forest-600 hover:bg-[#f0e7d4]"
          }`}
        >
          <PlusCircle className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-1">
        <div className="flex-1">
          <NavButton active={tab === "manage-testimonials"} onClick={() => onTabChange("manage-testimonials")} icon={MessageSquareQuote}>
            Testimonials
          </NavButton>
        </div>
        <button
          type="button"
          aria-label="Add testimonial"
          onClick={() => onTabChange("add-testimonial")}
          className={`icon-button flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            tab === "add-testimonial" ? "bg-forest-900 text-sand-50" : "text-forest-600 hover:bg-[#f0e7d4]"
          }`}
        >
          <PlusCircle className="h-4 w-4" />
        </button>
      </div>

      <SectionLabel>Orders</SectionLabel>
      <Link
        href="/mimin/orders"
        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-forest-700 transition-colors duration-150 hover:bg-[#f0e7d4]"
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
    </aside>
  );
}

export type {Tab as AdminTab};
