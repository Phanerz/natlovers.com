"use client";

import Link from "next/link";
import type {Route} from "next";
import {usePathname, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";
import {ChevronDown, GalleryHorizontal, LayoutDashboard, PlusCircle, Receipt, ShoppingBag, Users, Warehouse} from "lucide-react";
import {ShopProductType, productTypeLabels, shopProductTypes} from "@/app/catalogue/shop-data";

// Typography/spacing lifted directly from app/catalogue/filter-sidebar.tsx's
// FilterSection — same uppercase tracked label, same border-b rhythm
// between groups — so the admin shell reads as the same design system as
// the public catalogue's own sidebar, not a separate admin template.
function SectionLabel({children}: {children: React.ReactNode}) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e2e28]">{children}</span>;
}

function NavLink({
  href,
  active,
  icon: Icon,
  children
}: {
  href: Route;
  active: boolean;
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        active ? "bg-forest-900 text-sand-50 shadow-[0_4px_14px_rgba(23,32,21,0.22)]" : "text-[#3c3c34] hover:bg-[#eee7d8] hover:text-[#344332]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </Link>
  );
}

function AddLink({href, active, label}: {href: Route; active: boolean; label: string}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-105 active:scale-95 ${
        active ? "bg-forest-900 text-sand-50" : "text-[#a39d8d] hover:bg-[#eee7d8] hover:text-[#344332]"
      }`}
    >
      <PlusCircle className="h-4 w-4" />
    </Link>
  );
}

function SubItem({href, label, active}: {href: Route; label: string; active: boolean}) {
  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-2 rounded-lg py-1.5 pl-8 pr-3 text-left text-[13px] transition-colors duration-150 ${
        active ? "font-medium text-forest-900" : "text-[#6b6b5f] hover:text-[#344332]"
      }`}
    >
      <span className={`h-1 w-1 rounded-full transition-colors duration-150 ${active ? "bg-forest-900" : "bg-transparent"}`} />
      {label}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ordersAwaiting, setOrdersAwaiting] = useState<number | null>(null);
  const [productsExpanded, setProductsExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard-stats?range=all", {cache: "no-store"})
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

  const tab = searchParams.get("tab");
  const onDashboardRoute = pathname === "/mimin";
  const isDashboardHome = onDashboardRoute && !tab;
  const isManage = onDashboardRoute && tab === "manage";
  const isAdd = onDashboardRoute && tab === "add";
  const isManageHero = onDashboardRoute && tab === "manage-hero-cards";
  const isAddHero = onDashboardRoute && tab === "add-hero-card";

  return (
    <aside className="w-full shrink-0 rounded-[1.75rem] border border-[#d4c5ab] bg-[#fffaf1] p-4 lg:w-64">
      <div className="border-b border-[#d9cfc0] pb-3">
        <NavLink href="/mimin" active={isDashboardHome} icon={LayoutDashboard}>
          Dashboard
        </NavLink>
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
                onClick={() => setProductsExpanded((value) => !value)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isManage ? "bg-forest-900 text-sand-50 shadow-[0_4px_14px_rgba(23,32,21,0.22)]" : "text-[#3c3c34] hover:bg-[#eee7d8] hover:text-[#344332]"
                }`}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <Link href="/mimin?tab=manage" className="flex-1">
                  Manage Products
                </Link>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    productsExpanded ? "" : "-rotate-90"
                  }`}
                />
              </button>
            </div>
            <AddLink href="/mimin?tab=add" active={isAdd} label="Add product" />
          </div>

          {productsExpanded ? (
            <div className="space-y-0.5 pt-0.5">
              <SubItem href="/mimin?tab=manage" label="All Products" active={isManage} />
              {shopProductTypes.map((type: ShopProductType) => (
                <SubItem
                  key={type}
                  href={`/mimin?tab=manage&type=${type.toLowerCase()}`}
                  label={productTypeLabels[type].en}
                  active={false}
                />
              ))}
            </div>
          ) : null}

          <NavLink href="/mimin/stock" active={pathname === "/mimin/stock"} icon={Warehouse}>
            Stock &amp; Inventory
          </NavLink>

          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <NavLink href="/mimin?tab=manage-hero-cards" active={isManageHero} icon={GalleryHorizontal}>
                Hero Cards
              </NavLink>
            </div>
            <AddLink href="/mimin?tab=add-hero-card" active={isAddHero} label="Add hero card" />
          </div>
        </div>
      </div>

      <div className="border-b border-[#d9cfc0] py-3">
        <div className="px-3 pb-2">
          <SectionLabel>Sales</SectionLabel>
        </div>
        <Link
          href="/mimin/orders"
          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            pathname === "/mimin/orders"
              ? "bg-forest-900 text-sand-50 shadow-[0_4px_14px_rgba(23,32,21,0.22)]"
              : "text-[#3c3c34] hover:bg-[#eee7d8] hover:text-[#344332]"
          }`}
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

      <div className="pt-3">
        <div className="px-3 pb-2">
          <SectionLabel>Customers</SectionLabel>
        </div>
        <NavLink href="/mimin/customers" active={pathname === "/mimin/customers"} icon={Users}>
          Customers
        </NavLink>
      </div>
    </aside>
  );
}
