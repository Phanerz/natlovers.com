"use client";

import Link from "next/link";
import type {Route} from "next";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Heart, Receipt, ShoppingBag, Sparkles} from "lucide-react";
import type {ActivityItem, ActivityKind, ActivityResult} from "@/lib/activity";

// A live feed of what customers are doing: ordered, put in a bag, liked. One component,
// three sizes: "card" for a product's own admin page, "compact" for the admin sidebar, and
// "page" for the full Activity page. Each row is a person, what they did and when.

type Variant = "card" | "compact" | "page";
type Tab = "all" | ActivityKind;

const KINDS: Record<ActivityKind, {verb: string; icon: typeof Receipt; tint: string; tab: string; tabShort: string}> = {
  order: {verb: "ordered", icon: Receipt, tint: "text-emerald-600 bg-emerald-600/15", tab: "Ordered", tabShort: "Orders"},
  bag: {verb: "put in their bag", icon: ShoppingBag, tint: "text-amber-600 bg-amber-600/15", tab: "In a bag", tabShort: "Bags"},
  like: {verb: "liked", icon: Heart, tint: "text-rose-500 bg-rose-500/15", tab: "Liked", tabShort: "Likes"}
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {day: "numeric", month: "short"});
}

function displayName(customer: ActivityItem["customer"]): string {
  if (customer.name?.trim()) return customer.name.trim();
  if (customer.email) return customer.email.split("@")[0];
  return "Someone";
}

// A soft, warm tint picked from the person's id, so each customer keeps the same colour.
function avatarTint(seed: string | null): string {
  let hash = 0;
  for (const char of seed ?? "x") hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${(hash % 60) + 15} 38% 52% / 0.28)`;
}

function Avatar({customer, size}: {customer: ActivityItem["customer"]; size: number}) {
  const name = displayName(customer);
  return customer.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={customer.image} alt="" referrerPolicy="no-referrer" className="flex-none rounded-full object-cover" style={{width: size, height: size}} />
  ) : (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center rounded-full font-semibold text-forest-900"
      style={{width: size, height: size, background: avatarTint(customer.id), fontSize: size * 0.4}}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Row({item, variant, showProduct}: {item: ActivityItem; variant: Variant; showProduct: boolean}) {
  const kind = KINDS[item.kind];
  const Icon = kind.icon;
  const size = variant === "compact" ? 30 : 40;
  const body = (
    <>
      <span className="relative flex-none">
        <Avatar customer={item.customer} size={size} />
        <span
          aria-hidden
          className={`absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-[#fffaf1] dark:ring-[#3e3b2e] ${kind.tint}`}
        >
          <Icon className="h-2.5 w-2.5" strokeWidth={2.6} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block ${variant === "compact" ? "text-[12.5px] leading-snug" : "text-sm leading-snug"} text-forest-900`}>
          <span className="font-semibold">{displayName(item.customer)}</span> <span className="text-forest-600">{kind.verb}</span>
          {showProduct && item.product.name ? <span className="font-medium"> {item.product.name}</span> : null}
        </span>
        {variant !== "compact" ? (
          <span className="mt-0.5 block truncate text-xs text-forest-600">
            {[item.detail, variant === "page" ? item.customer.email : null].filter(Boolean).join(" · ")}
          </span>
        ) : null}
      </span>
      <span className="flex-none self-start pt-0.5 text-[11px] text-forest-500">{timeAgo(item.at)}</span>
    </>
  );
  const className = `flex items-center gap-3 rounded-xl ${variant === "compact" ? "px-1.5 py-1.5" : "px-2 py-2.5"} transition-colors hover:bg-black/5`;
  return item.customer.id ? (
    <Link href={`/mimin/customers/${item.customer.id}` as Route} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function ActivityFeed({
  productSlug,
  variant = "card",
  limit = 20
}: {
  // Only this product's activity; leave out for the whole shop.
  productSlug?: string;
  variant?: Variant;
  limit?: number;
}) {
  const [data, setData] = useState<ActivityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({limit: String(limit)});
      if (productSlug) params.set("product", productSlug);
      const response = await fetch(`/api/admin/activity?${params}`, {cache: "no-store"});
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not load activity.");
      setData(body);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load activity.");
    }
  }, [limit, productSlug]);

  useEffect(() => {
    void load();
    // Refreshes quietly every minute while the tab is open and visible.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const shown = useMemo(() => (data ? data.items.filter((item) => tab === "all" || item.kind === tab).slice(0, limit) : []), [data, tab, limit]);
  const compact = variant === "compact";
  const tabs: {key: Tab; label: string; count: number | null}[] = [
    {key: "all", label: "All", count: null},
    {key: "order", label: compact ? KINDS.order.tabShort : KINDS.order.tab, count: data?.counts.order ?? null},
    {key: "bag", label: compact ? KINDS.bag.tabShort : KINDS.bag.tab, count: data?.counts.bag ?? null},
    {key: "like", label: compact ? KINDS.like.tabShort : KINDS.like.tab, count: data?.counts.like ?? null}
  ];

  return (
    <div>
      <div role="tablist" aria-label="Activity type" className={`flex flex-wrap ${compact ? "gap-1" : "gap-1.5"}`}>
        {tabs.map(({key, label, count}) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full border px-2.5 py-1 font-medium transition-colors ${compact ? "text-[11px]" : "text-xs"} ${
              tab === key ? "border-transparent bg-forest-900 text-white" : "border-[#d4c5ab] text-forest-700 hover:border-forest-400"
            }`}
          >
            {label}
            {count !== null ? <span className="ml-1 opacity-70">{count}</span> : null}
          </button>
        ))}
      </div>

      <div className={compact ? "mt-2" : "mt-3"}>
        {error ? (
          <p role="alert" className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
            {error}
          </p>
        ) : null}
        {!data && !error ? <p className="px-1 py-3 text-xs text-forest-600">Loading activity...</p> : null}
        {data && shown.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#d4c5ab] px-4 py-6 text-center">
            <Sparkles className="h-5 w-5 text-forest-500" aria-hidden />
            <p className="text-xs text-forest-600">
              {productSlug ? "Nothing yet. When someone orders, bags or likes this piece, it shows up here." : "Nothing yet. Orders, bags and likes will appear here as they happen."}
            </p>
          </div>
        ) : null}
        {shown.length ? (
          <ul className={variant === "page" ? "divide-y divide-[#d4c5ab]/40" : "space-y-0.5"}>
            {shown.map((item) => (
              <li key={item.id}>
                <Row item={item} variant={variant} showProduct={!productSlug} />
              </li>
            ))}
          </ul>
        ) : null}
        {data && variant === "card" ? (
          <p className="mt-3 text-[11px] text-forest-500">
            Last {data.days} days: {data.counts.order} ordered, {data.counts.bag} in bags now, {data.counts.like} liked.
          </p>
        ) : null}
      </div>
    </div>
  );
}
