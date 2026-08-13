"use client";

import Link from "next/link";
import type {Route} from "next";
import {useEffect, useState} from "react";
import {AlertTriangle, GalleryHorizontal, PackageCheck, PackageX, ShoppingBag} from "lucide-react";
import {OrdersChart} from "./orders-chart";

type Stats = {
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
  heroCardCount: number;
  ordersAwaitingTransfer: number;
};

// Icon, label, and number are stacked top-to-bottom (not centered as a
// block) so a longer label wrapping to two lines only pushes that one
// card's own number down slightly — it can never shift the icon's position
// relative to its neighbors, since every card starts from the same top
// edge. min-h keeps all 5 cards the same height even when one wraps.
function StatCard({
  icon: Icon,
  label,
  value,
  onClick,
  href,
  loading
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number;
  onClick?: () => void;
  href?: Route;
  loading: boolean;
}) {
  const content = (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-forest-500">{label}</p>
      <p className="mt-1 font-display text-3xl text-forest-900">{loading ? "—" : value}</p>
    </>
  );

  const className =
    "button-lift flex min-h-[128px] flex-col items-start rounded-[1.4rem] border border-[#d4c5ab] bg-[#fffaf1] p-4 text-left transition-colors duration-150 hover:bg-[#f6efdd]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function DashboardHome({onNavigate}: {onNavigate: (tab: "manage" | "manage-hero-cards") => void}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/dashboard-stats", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Stats | null) => {
        if (!cancelled && data) {
          setStats(data);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const awaiting = stats?.ordersAwaitingTransfer ?? 0;

  return (
    <div className="space-y-6">
      {/* Needs-attention card sits above the neutral cards and gets a
          distinct accent treatment only when there's actually something to
          act on — an empty queue shouldn't compete visually with real
          overview numbers below it. */}
      {!loading && awaiting > 0 ? (
        <Link
          href="/mimin/orders"
          className="button-lift flex items-center gap-4 rounded-[1.4rem] border border-[#a4402b]/40 bg-[#f7e9e2] p-5 transition-colors duration-150 hover:bg-[#f2ddd2]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#a4402b] text-white">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a4402b]">Needs attention</p>
            <p className="mt-1 font-display text-2xl text-[#7a2f1e]">
              {awaiting} order{awaiting === 1 ? "" : "s"} awaiting transfer
            </p>
          </div>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={ShoppingBag} label="Products" value={stats?.totalProducts ?? 0} onClick={() => onNavigate("manage")} loading={loading} />
        <StatCard icon={PackageCheck} label="Active" value={stats?.activeProducts ?? 0} onClick={() => onNavigate("manage")} loading={loading} />
        <StatCard icon={PackageX} label="Hidden" value={stats?.hiddenProducts ?? 0} onClick={() => onNavigate("manage")} loading={loading} />
        <StatCard
          icon={GalleryHorizontal}
          label="Hero Cards"
          value={stats?.heroCardCount ?? 0}
          onClick={() => onNavigate("manage-hero-cards")}
          loading={loading}
        />
        <StatCard icon={AlertTriangle} label="Awaiting Transfer" value={awaiting} href="/mimin/orders" loading={loading} />
      </div>

      <OrdersChart />
    </div>
  );
}
