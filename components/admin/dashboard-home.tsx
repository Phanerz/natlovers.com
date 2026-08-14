"use client";

import Link from "next/link";
import type {Route} from "next";
import {useEffect, useRef, useState} from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  ChevronDown,
  PackageCheck,
  PackageX,
  ReceiptText,
  ShoppingBag,
  Tag,
  Users,
  Wallet
} from "lucide-react";
import {DateRangeKey} from "@/lib/dashboard-stats";
import {OrdersChart} from "./orders-chart";

type Stats = {
  range: DateRangeKey;
  totalRevenue: number;
  totalRevenuePrevious: number | null;
  totalOrders: number;
  totalOrdersPrevious: number | null;
  itemsSold: number;
  averageOrderValue: number;
  averageOrderValuePrevious: number | null;
  totalProducts: number;
  activeProducts: number;
  hiddenProducts: number;
  heroCardCount: number;
  ordersAwaitingTransfer: number;
  customerCount: number;
};

const rangeLabels: Record<DateRangeKey, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  month: "This Month",
  year: "This Year",
  all: "All Time"
};
const rangeOrder: DateRangeKey[] = ["today", "7d", "month", "year", "all"];

function formatIdr(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

// A delta is only ever shown as a real comparison when both sides have
// something to compare — "all time" has no previous period, and a previous
// value of 0 makes a percentage change undefined, not "infinite growth."
function percentDelta(current: number, previous: number | null): {text: string; tone: "up" | "down" | "flat" | "none"} {
  if (previous === null || previous === 0) {
    return {text: "no data yet", tone: "none"};
  }
  const change = ((current - previous) / previous) * 100;
  if (change === 0) {
    return {text: "no change", tone: "flat"};
  }
  return {
    text: `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`,
    tone: change > 0 ? "up" : "down"
  };
}

function countDelta(current: number, previous: number | null): {text: string; tone: "up" | "down" | "flat" | "none"} {
  if (previous === null) {
    return {text: "no data yet", tone: "none"};
  }
  const change = current - previous;
  if (change === 0) {
    return {text: "no change vs previous period", tone: "flat"};
  }
  return {text: `${change > 0 ? "+" : ""}${change} vs previous period`, tone: change > 0 ? "up" : "down"};
}

function DeltaLine({delta, loading}: {delta: {text: string; tone: "up" | "down" | "flat" | "none"}; loading: boolean}) {
  if (loading) {
    return <p className="mt-1.5 text-xs text-forest-400">—</p>;
  }
  const toneClass =
    delta.tone === "up"
      ? "text-[#3f7a4a]"
      : delta.tone === "down"
        ? "text-[#a4402b]"
        : "text-forest-500";
  return (
    <p className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${toneClass}`}>
      {delta.tone === "up" ? <ArrowUp className="h-3 w-3" /> : delta.tone === "down" ? <ArrowDown className="h-3 w-3" /> : null}
      {delta.text}
    </p>
  );
}

// Every card: icon in its own generously-padded circle (never clipped),
// content stacked top-down (not centered as a block) so the alignment
// discipline from the earlier fix holds regardless of label/delta length.
function KpiCard({
  icon: Icon,
  iconTone = "neutral",
  label,
  value,
  subtext,
  delta,
  loading,
  href
}: {
  icon: typeof ShoppingBag;
  iconTone?: "neutral" | "amber" | "red" | "green";
  label: string;
  value: string;
  subtext?: string;
  delta?: {text: string; tone: "up" | "down" | "flat" | "none"};
  loading: boolean;
  href?: Route;
}) {
  const iconToneClass = {
    neutral: "bg-[#eee4cd] text-forest-700",
    amber: "bg-[#f3e3c9] text-[#8a5a1f]",
    red: "bg-[#f3d9d0] text-[#a4402b]",
    green: "bg-[#dcead0] text-[#2f5b2b]"
  }[iconTone];

  const content = (
    <>
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${iconToneClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-forest-500">{label}</p>
      <p className="mt-1 font-display text-2xl text-forest-900 sm:text-[1.7rem]">{loading ? "—" : value}</p>
      {subtext ? <p className="mt-1 text-xs text-forest-500">{loading ? "" : subtext}</p> : null}
      {delta ? <DeltaLine delta={delta} loading={loading} /> : null}
    </>
  );

  const className =
    "group flex min-h-[148px] flex-col items-start rounded-[1.4rem] border border-[#d4c5ab] bg-[#fffaf1] p-4 text-left transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-forest-400 hover:bg-[#f6efdd] hover:shadow-[0_10px_28px_rgba(23,32,21,0.1)] active:translate-y-0 active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={`${className} cursor-default hover:translate-y-0 hover:shadow-none`}>{content}</div>;
}

function RangePicker({range, onChange}: {range: DateRangeKey; onChange: (range: DateRangeKey) => void}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-[#d4c5ab] bg-[#fffaf1] px-4 py-2.5 text-sm font-medium text-forest-800 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-forest-400 hover:bg-[#f6efdd]"
      >
        <Calendar className="h-4 w-4 text-forest-500" />
        {rangeLabels[range]}
        <ChevronDown className={`h-3.5 w-3.5 text-forest-500 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44 origin-top-right rounded-2xl border border-[#d7cab2] bg-[#fffaf1] p-1.5 shadow-[0_18px_40px_rgba(28,25,18,0.18)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        {rangeOrder.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              onChange(value);
              setOpen(false);
            }}
            className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors duration-150 ${
              range === value ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-[#f0e7d4]"
            }`}
          >
            {rangeLabels[value]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DashboardHome({onNavigate}: {onNavigate: (tab: "manage" | "manage-hero-cards") => void}) {
  const [range, setRange] = useState<DateRangeKey>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/dashboard-stats?range=${range}`, {cache: "no-store"})
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
  }, [range]);

  const awaiting = stats?.ordersAwaitingTransfer ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-forest-900">Overview</h2>
        </div>
        <RangePicker range={range} onChange={setRange} />
      </div>

      {/* Needs-attention card sits above the neutral cards and gets a
          distinct accent treatment only when there's actually something to
          act on — an empty queue shouldn't compete visually with real
          overview numbers below it. */}
      {!loading && awaiting > 0 ? (
        <Link
          href="/mimin/orders"
          className="group flex items-center gap-4 rounded-[1.4rem] border border-[#a4402b]/40 bg-[#f7e9e2] p-5 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(164,64,43,0.14)]"
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

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-forest-500">Sales</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={Wallet}
            iconTone="green"
            label="Total Revenue"
            value={formatIdr(stats?.totalRevenue ?? 0)}
            delta={percentDelta(stats?.totalRevenue ?? 0, stats?.totalRevenuePrevious ?? null)}
            loading={loading}
          />
          <KpiCard
            icon={ShoppingBag}
            label="Total Orders"
            value={String(stats?.totalOrders ?? 0)}
            delta={countDelta(stats?.totalOrders ?? 0, stats?.totalOrdersPrevious ?? null)}
            loading={loading}
            href="/mimin/orders"
          />
          <KpiCard icon={Tag} label="Items Sold" value={String(stats?.itemsSold ?? 0)} loading={loading} />
          <KpiCard
            icon={ReceiptText}
            label="Average Order Value"
            value={formatIdr(stats?.averageOrderValue ?? 0)}
            delta={percentDelta(stats?.averageOrderValue ?? 0, stats?.averageOrderValuePrevious ?? null)}
            loading={loading}
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-forest-500">Catalogue &amp; Customers</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={PackageCheck}
            label="Products Listed"
            value={String(stats?.totalProducts ?? 0)}
            subtext={`${stats?.activeProducts ?? 0} visible · ${stats?.hiddenProducts ?? 0} hidden`}
            loading={loading}
            href={"/mimin?tab=manage" as Route}
          />
          <KpiCard icon={PackageX} iconTone="amber" label="Low Stock" value="Not tracked" loading={loading} href="/mimin/stock" />
          <KpiCard icon={AlertTriangle} iconTone="red" label="Out of Stock" value="Not tracked" loading={loading} href="/mimin/stock" />
          <KpiCard icon={Users} label="Customers" value={String(stats?.customerCount ?? 0)} loading={loading} href="/mimin/customers" />
        </div>
      </div>

      <OrdersChart />

      {stats && !loading ? (
        <p className="flex items-center gap-1.5 text-xs text-forest-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {stats.heroCardCount} hero card{stats.heroCardCount === 1 ? "" : "s"} live ·{" "}
          <button type="button" onClick={() => onNavigate("manage-hero-cards")} className="underline decoration-dotted underline-offset-2 hover:text-forest-600">
            manage hero cards
          </button>
        </p>
      ) : null}
    </div>
  );
}
