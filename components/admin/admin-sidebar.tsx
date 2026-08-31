"use client";

import Link from "next/link";
import type {Route} from "next";
import {usePathname, useSearchParams} from "next/navigation";
import {useEffect, useState} from "react";
import {signOut} from "next-auth/react";
import {
  Boxes,
  ChevronUp,
  GalleryHorizontal,
  LayoutDashboard,
  LogOut,
  Palette,
  PlusCircle,
  Receipt,
  ShoppingBag,
  Users,
  Warehouse
} from "lucide-react";
import {ShopProductType, productTypeLabels, shopProductTypes} from "@/app/catalogue/shop-data";

// Typography/spacing/interaction lifted directly from app/catalogue/
// filter-sidebar.tsx's FilterSection  -  same uppercase tracked label, same
// border-b rhythm between groups, same ChevronUp-flips-to-180-when-closed
// accordion  -  so the admin shell reads as the same design system as the
// public catalogue's own sidebar, not a separate admin template. Unlike the
// catalogue sidebar, this one has no whole-panel collapse/rail mode: admin
// nav needs to stay reachable at all times, so only the "Manage Products"
// sub-list gets the accordion treatment, never the sidebar itself.
function SectionLabel({children}: {children: React.ReactNode}) {
  return <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2e2e28]">{children}</span>;
}

// Active state uses a flat solid dark fill (.flat-nav-active) rather than
// the site's glass treatment  -  per DESIGN.md, glass is reserved for primary
// buttons/CTAs and explicitly-marked featured cards, and admin nav doesn't
// qualify as either.
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
      className={`button-lift flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        active
          ? "flat-nav-active text-sand-50"
          : "text-[#3c3c34] hover:-translate-y-px hover:bg-[#eee7d8] hover:text-[#344332] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
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
      className={`icon-button button-lift flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 active:scale-90 ${
        active
          ? "flat-nav-active text-sand-50"
          : "border border-[#d4c5ab] bg-[#fffaf1] text-[#5c5c50] hover:text-[#344332]"
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
      className={`flex w-full items-center gap-2 rounded-xl py-1.5 pl-8 pr-3 text-left text-[13px] transition-colors duration-150 ${
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
  const [customRequestsOpen, setCustomRequestsOpen] = useState<number | null>(null);
  const [productsExpanded, setProductsExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/sidebar-badges", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {ordersAwaitingTransfer?: number; openCustomRequests?: number} | null) => {
        if (!cancelled && data) {
          setOrdersAwaiting(data.ordersAwaitingTransfer ?? null);
          setCustomRequestsOpen(data.openCustomRequests ?? null);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const tab = searchParams.get("tab");
  // Bags/Dolls/Accessories/Apparels sub-links carry their type lowercased
  // (see the href below)  -  comparing against that same lowercased form here
  // is what makes the active dot actually track the selected category
  // instead of always sitting on "All Products".
  const selectedType = searchParams.get("type");
  const onDashboardRoute = pathname === "/mimin";
  const isDashboardHome = onDashboardRoute && !tab;
  const isManage = onDashboardRoute && tab === "manage";
  const isAdd = onDashboardRoute && tab === "add";
  const isManageHero = onDashboardRoute && tab === "manage-hero-cards";
  const isAddHero = onDashboardRoute && tab === "add-hero-card";
  const isManageBodyShapes = onDashboardRoute && (tab === "manage-body-shapes" || tab === "edit-body-shape");
  const isAddBodyShape = onDashboardRoute && tab === "add-body-shape";

  return (
    <aside className="w-full shrink-0 rounded-xl border border-[#d4c5ab] bg-[#fffaf1] p-4 lg:w-64">
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
                className={`button-lift flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98] ${
                  isManage
                    ? "flat-nav-active text-sand-50"
                    : "text-[#3c3c34] hover:-translate-y-px hover:bg-[#eee7d8] hover:text-[#344332] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                }`}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <Link href="/mimin?tab=manage" className="flex-1">
                  Manage Products
                </Link>
                <ChevronUp
                  className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ease-out ${
                    productsExpanded ? "" : "rotate-180"
                  }`}
                />
              </button>
            </div>
            <AddLink href="/mimin?tab=add" active={isAdd} label="Add product" />
          </div>

          <div
            className={`grid transition-all duration-300 ease-out ${
              productsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="space-y-0.5 overflow-hidden pt-0.5">
              <SubItem href="/mimin?tab=manage" label="All Products" active={isManage && !selectedType} />
              {shopProductTypes.map((type: ShopProductType) => (
                <SubItem
                  key={type}
                  href={`/mimin?tab=manage&type=${type.toLowerCase()}`}
                  label={productTypeLabels[type].en}
                  active={isManage && selectedType === type.toLowerCase()}
                />
              ))}
            </div>
          </div>

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

          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <NavLink href="/mimin?tab=manage-body-shapes" active={isManageBodyShapes} icon={Boxes}>
                Body Shapes
              </NavLink>
            </div>
            <AddLink href="/mimin?tab=add-body-shape" active={isAddBodyShape} label="Add body shape" />
          </div>
        </div>
      </div>

      <div className="border-b border-[#d9cfc0] py-3">
        <div className="px-3 pb-2">
          <SectionLabel>Sales</SectionLabel>
        </div>
        <Link
          href="/mimin/orders"
          className={`button-lift flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            pathname === "/mimin/orders"
              ? "flat-nav-active text-sand-50"
              : "text-[#3c3c34] hover:-translate-y-px hover:bg-[#eee7d8] hover:text-[#344332] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
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
        <Link
          href="/mimin/custom-requests"
          className={`button-lift mt-1 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            pathname?.startsWith("/mimin/custom-requests")
              ? "flat-nav-active text-sand-50"
              : "text-[#3c3c34] hover:bg-[#eee7d8] hover:text-[#344332]"
          }`}
        >
          <span className="flex items-center gap-2.5">
            <Palette className="h-4 w-4 shrink-0" />
            Custom Studio
          </span>
          {customRequestsOpen ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#a4402b] px-1.5 text-[11px] font-semibold text-white">
              {customRequestsOpen}
            </span>
          ) : null}
        </Link>
      </div>

      <div className="border-b border-[#d9cfc0] pt-3 pb-3">
        <div className="px-3 pb-2">
          <SectionLabel>Customers</SectionLabel>
        </div>
        <NavLink href="/mimin/customers" active={pathname?.startsWith("/mimin/customers") ?? false} icon={Users}>
          Customers
        </NavLink>
      </div>

      <div className="pt-3">
        <button
          type="button"
          onClick={() => signOut({callbackUrl: "/mimin"})}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium text-[#8a4a3a] transition-colors duration-150 hover:bg-[#f7e9e2]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
