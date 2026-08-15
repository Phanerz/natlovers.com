"use client";

import Link from "next/link";
import type {Route} from "next";
import {useEffect, useRef, useState} from "react";
import {
  AlertTriangle,
  ArrowUp,
  Calendar,
  ChevronDown,
  Eye,
  PackageCheck,
  PackageX,
  ReceiptText,
  ShoppingBag,
  Tag,
  Trophy,
  Users,
  Wallet
} from "lucide-react";
import {Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {DateRangeKey} from "@/lib/dashboard-stats";
import {orderStatusLabels} from "@/lib/order-status";
import {KpiCard, countDelta, percentDelta} from "@/components/admin/kpi-card";

type SalesSeriesPoint = {date: string; revenue: number; orders: number; itemsSold: number};
type RecentOrder = {
  id: string;
  orderRef: string;
  customerName: string | null;
  customerEmail: string | null;
  totalIdr: number;
  status: string;
  createdAt: string;
};
type BestSellingProduct = {slug: string; name: string; unitsSold: number; revenue: number};

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
  ordersAwaitingTransfer: number;
  customerCount: number;
  lowStockCount: number | null;
  outOfStockCount: number | null;
  salesSeries: SalesSeriesPoint[];
  recentOrders: RecentOrder[];
  bestSellingProducts: BestSellingProduct[] | null;
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {day: "numeric", month: "short", year: "numeric"});
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

// Computed after mount (not during the server render) so a deployed
// server's clock/timezone can never disagree with the visitor's own and
// cause a hydration mismatch — starts with a neutral fallback that's
// replaced within a frame.
function useGreeting(): string {
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);
  return greeting;
}

const metricLabels: Record<"revenue" | "orders" | "itemsSold", string> = {
  revenue: "Revenue",
  orders: "Orders",
  itemsSold: "Items Sold"
};

function SalesOverviewChart({series}: {series: SalesSeriesPoint[]}) {
  const [metric, setMetric] = useState<"revenue" | "orders" | "itemsSold">("revenue");
  const hasData = series.some((point) => point.revenue > 0 || point.orders > 0 || point.itemsSold > 0);

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-forest-900">Sales Overview</h2>
        <div className="flex gap-1 rounded-full border border-[#d4c5ab] bg-[#fffdf9] p-1">
          {(Object.keys(metricLabels) as Array<"revenue" | "orders" | "itemsSold">).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                metric === key ? "bg-forest-900 text-sand-50" : "text-forest-600 hover:bg-[#f0e7d4]"
              }`}
            >
              {metricLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-forest-500">No sales recorded in this period yet.</p>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{top: 8, right: 8, left: 0, bottom: 0}}>
              <defs>
                <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#344332" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#344332" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7ddc6" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 11, fill: "#7a7360"}} tickLine={false} axisLine={{stroke: "#d4c5ab"}} />
              <YAxis
                tick={{fontSize: 11, fill: "#7a7360"}}
                tickLine={false}
                axisLine={false}
                width={metric === "revenue" ? 64 : 36}
                tickFormatter={(value: number) => (metric === "revenue" ? `${Math.round(value / 1000)}k` : String(value))}
              />
              <Tooltip
                formatter={(value) => (metric === "revenue" ? formatIdr(Number(value)) : Number(value))}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #d4c5ab",
                  backgroundColor: "#fffaf1",
                  fontSize: 12
                }}
              />
              <Area type="monotone" dataKey={metric} stroke="#344332" strokeWidth={2} fill="url(#salesFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function NeedsAttentionCard({stats}: {stats: Stats}) {
  const items: {key: string; icon: typeof AlertTriangle; label: string; count: number; href: Route}[] = [];

  if (stats.outOfStockCount) {
    items.push({key: "oos", icon: PackageX, label: "products out of stock", count: stats.outOfStockCount, href: "/mimin/stock"});
  }
  if (stats.lowStockCount) {
    items.push({key: "low", icon: AlertTriangle, label: "products running low", count: stats.lowStockCount, href: "/mimin/stock"});
  }
  if (stats.ordersAwaitingTransfer) {
    items.push({
      key: "pending",
      icon: ReceiptText,
      label: "orders awaiting transfer",
      count: stats.ordersAwaitingTransfer,
      href: "/mimin/orders"
    });
  }
  if (stats.hiddenProducts) {
    items.push({
      key: "hidden",
      icon: Eye,
      label: "products hidden from catalogue",
      count: stats.hiddenProducts,
      href: "/mimin?tab=manage" as Route
    });
  }

  return (
    <div className="card space-y-4 p-6 sm:p-8">
      <h2 className="font-display text-xl text-forest-900">Needs Attention</h2>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3 transition-colors duration-150 hover:bg-[#f6efdd]"
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-[#a4402b]" />
                <span className="text-sm text-forest-800">
                  <span className="font-semibold text-forest-900">{item.count}</span> {item.label}
                </span>
              </span>
              <ArrowUp className="h-3.5 w-3.5 rotate-45 text-forest-400" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-forest-500">Nothing needs attention right now.</p>
      )}
    </div>
  );
}

const statusBadgeStyles: Record<string, string> = {
  pending_transfer: "bg-[#f6ddc9] text-[#8a4a1f]",
  paid: "bg-[#dcead0] text-[#2f5b2b]",
  fulfilled: "bg-[#dbe6f2] text-[#2a4a70]"
};

function RecentOrdersCard({orders}: {orders: RecentOrder[]}) {
  return (
    <div className="card space-y-4 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-forest-900">Recent Orders</h2>
        <Link href="/mimin/orders" className="text-sm font-medium text-forest-700 hover:text-forest-900">
          View all
        </Link>
      </div>
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                <th className="pb-3 pr-3">Order</th>
                <th className="pb-3 pr-3">Customer</th>
                <th className="pb-3 pr-3">Total</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[#e7ddc6]">
                  <td className="py-3 pr-3">
                    <Link href="/mimin/orders" className="font-display text-base text-forest-900 hover:underline">
                      {order.orderRef}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-forest-700">{order.customerName ?? order.customerEmail ?? "—"}</td>
                  <td className="py-3 pr-3 whitespace-nowrap text-forest-700">{formatIdr(order.totalIdr)}</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadgeStyles[order.status] ?? "bg-[#eee4cd] text-forest-700"}`}>
                      {orderStatusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="py-3 whitespace-nowrap text-forest-600">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-forest-500">No orders yet.</p>
      )}
    </div>
  );
}

function BestSellingProductsCard({products}: {products: BestSellingProduct[] | null}) {
  return (
    <div className="card space-y-4 p-6 sm:p-8">
      <h2 className="font-display text-xl text-forest-900">Best Selling Products</h2>
      {products === null ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <Trophy className="h-5 w-5 text-forest-400" />
          <p className="text-sm text-forest-500">Not enough order data yet to rank products.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product, index) => (
            <div key={product.slug} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3">
              <span className="flex items-center gap-3 text-sm text-forest-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eee4cd] text-xs font-semibold text-forest-700">
                  {index + 1}
                </span>
                {product.name}
              </span>
              <span className="shrink-0 text-right text-xs text-forest-600">
                <span className="font-semibold text-forest-900">{product.unitsSold}</span> sold · {formatIdr(product.revenue)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardHome({userName, onNavigate}: {userName?: string | null; onNavigate: (tab: "manage" | "manage-hero-cards") => void}) {
  const [range, setRange] = useState<DateRangeKey>("all");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const greeting = useGreeting();

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-forest-600">
            {greeting}, {userName?.split(" ")[0] ?? "Admin"} 👋
          </p>
          <h1 className="mt-1 font-display text-3xl text-forest-900">Dashboard</h1>
          <p className="mt-1 text-sm text-forest-500">A live overview of your store&rsquo;s sales, orders, and inventory.</p>
        </div>
        <RangePicker range={range} onChange={setRange} />
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-forest-500">Sales</p>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={Wallet}
            iconTone="green"
            label="Total Revenue"
            value={formatIdr(stats?.totalRevenue ?? 0)}
            delta={stats ? percentDelta(stats.totalRevenue, stats.totalRevenuePrevious) : null}
            loading={loading}
          />
          <KpiCard
            icon={ShoppingBag}
            label="Total Orders"
            value={String(stats?.totalOrders ?? 0)}
            delta={stats ? countDelta(stats.totalOrders, stats.totalOrdersPrevious) : null}
            loading={loading}
            href="/mimin/orders"
          />
          <KpiCard icon={Tag} label="Items Sold" value={String(stats?.itemsSold ?? 0)} loading={loading} />
          <KpiCard
            icon={ReceiptText}
            label="Average Order Value"
            value={formatIdr(stats?.averageOrderValue ?? 0)}
            delta={stats ? percentDelta(stats.averageOrderValue, stats.averageOrderValuePrevious) : null}
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
          <KpiCard
            icon={AlertTriangle}
            iconTone="amber"
            label="Low Stock"
            value={stats?.lowStockCount === null || stats?.lowStockCount === undefined ? "Not tracked" : String(stats.lowStockCount)}
            loading={loading}
            href="/mimin/stock"
          />
          <KpiCard
            icon={PackageX}
            iconTone="red"
            label="Out of Stock"
            value={stats?.outOfStockCount === null || stats?.outOfStockCount === undefined ? "Not tracked" : String(stats.outOfStockCount)}
            loading={loading}
            href="/mimin/stock"
          />
          <KpiCard icon={Users} label="Customers (CRM)" value={String(stats?.customerCount ?? 0)} loading={loading} href="/mimin/customers" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <SalesOverviewChart series={stats?.salesSeries ?? []} />
        {stats ? <NeedsAttentionCard stats={stats} /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RecentOrdersCard orders={stats?.recentOrders ?? []} />
        <BestSellingProductsCard products={stats?.bestSellingProducts ?? null} />
      </div>

      <div className="text-right">
        <button
          type="button"
          onClick={() => onNavigate("manage-hero-cards")}
          className="text-xs text-forest-400 underline decoration-dotted underline-offset-2 hover:text-forest-600"
        >
          Manage hero cards
        </button>
      </div>
    </div>
  );
}
