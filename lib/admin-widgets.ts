import type {ComponentType} from "react";
import {AlertTriangle, Clock, PackageCheck, PackageX, ReceiptText, Repeat, ShoppingBag, Tag, UserCheck, UserPlus, Users, Wallet} from "lucide-react";
import type {CustomerTelemetry} from "@/lib/customers";
import type {DashboardStats} from "@/lib/dashboard-stats";

// Every metric an admin can pin to their account-page overview. Deliberately
// reuses the exact icon/tone choices the main admin dashboard already uses
// for the same metric (Wallet/green for revenue, AlertTriangle/amber for low
// stock, etc.) so a widget reads as the same number wherever it's pinned,
// not a re-skinned duplicate. Values are computed from data already fetched
// live elsewhere (getCustomerTelemetry, getDashboardStats)  -  no new queries,
// no fabricated numbers.
export const WIDGET_KEYS = [
  "totalCustomers",
  "newCustomersThisMonth",
  "returningCustomers",
  "repeatPurchaseRate",
  "totalRevenue",
  "totalOrders",
  "itemsSold",
  "averageOrderValue",
  "activeProducts",
  "ordersAwaitingTransfer",
  "lowStockCount",
  "outOfStockCount"
] as const;

export type WidgetKey = (typeof WIDGET_KEYS)[number];

// Matches the four cards the account page always showed before this became
// configurable  -  an admin who never opens the picker sees the same overview
// they always had, not a blank section.
export const DEFAULT_WIDGETS: WidgetKey[] = ["totalCustomers", "newCustomersThisMonth", "returningCustomers", "repeatPurchaseRate"];

export const MAX_WIDGETS = 4;

function formatIdr(value: number): string {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export type WidgetSourceData = {telemetry: CustomerTelemetry; stats: DashboardStats};

type WidgetMeta = {
  label: string;
  icon: ComponentType<{className?: string}>;
  iconTone: "neutral" | "amber" | "red" | "green";
  getValue: (data: WidgetSourceData) => {value: string; subtext?: string};
};

export const WIDGET_CATALOG: Record<WidgetKey, WidgetMeta> = {
  totalCustomers: {
    label: "Total Customers",
    icon: Users,
    iconTone: "neutral",
    getValue: ({telemetry}) => ({value: String(telemetry.totalCustomers), subtext: `+${telemetry.newThisMonth} this month`})
  },
  newCustomersThisMonth: {
    label: "New Customers",
    icon: UserPlus,
    iconTone: "green",
    getValue: ({telemetry}) => ({value: String(telemetry.newThisMonth), subtext: "This calendar month"})
  },
  returningCustomers: {
    label: "Returning Customers",
    icon: UserCheck,
    iconTone: "neutral",
    getValue: ({telemetry}) => ({value: String(telemetry.returningCustomers), subtext: "Ordered 2+ times"})
  },
  repeatPurchaseRate: {
    label: "Repeat Purchase Rate",
    icon: Repeat,
    iconTone: "green",
    getValue: ({telemetry}) => ({value: `${telemetry.repeatPurchaseRate}%`, subtext: "Customers who returned"})
  },
  totalRevenue: {
    label: "Total Revenue",
    icon: Wallet,
    iconTone: "green",
    getValue: ({stats}) => ({value: formatIdr(stats.totalRevenue), subtext: "All time"})
  },
  totalOrders: {
    label: "Total Orders",
    icon: ShoppingBag,
    iconTone: "neutral",
    getValue: ({stats}) => ({value: String(stats.totalOrders), subtext: "All time"})
  },
  itemsSold: {
    label: "Items Sold",
    icon: Tag,
    iconTone: "neutral",
    getValue: ({stats}) => ({value: String(stats.itemsSold), subtext: "All time"})
  },
  averageOrderValue: {
    label: "Average Order Value",
    icon: ReceiptText,
    iconTone: "neutral",
    getValue: ({stats}) => ({value: formatIdr(stats.averageOrderValue), subtext: "All time"})
  },
  activeProducts: {
    label: "Active Products",
    icon: PackageCheck,
    iconTone: "neutral",
    getValue: ({stats}) => ({value: String(stats.activeProducts), subtext: `${stats.hiddenProducts} hidden`})
  },
  ordersAwaitingTransfer: {
    label: "Awaiting Transfer",
    icon: Clock,
    iconTone: "amber",
    getValue: ({stats}) => ({value: String(stats.ordersAwaitingTransfer), subtext: "Pending payment"})
  },
  lowStockCount: {
    label: "Low Stock",
    icon: AlertTriangle,
    iconTone: "amber",
    getValue: ({stats}) => ({
      value: stats.lowStockCount === null ? "Not tracked" : String(stats.lowStockCount),
      subtext: "Below threshold"
    })
  },
  outOfStockCount: {
    label: "Out of Stock",
    icon: PackageX,
    iconTone: "red",
    getValue: ({stats}) => ({
      value: stats.outOfStockCount === null ? "Not tracked" : String(stats.outOfStockCount),
      subtext: "Unavailable for sale"
    })
  }
};

export function isWidgetKey(value: string): value is WidgetKey {
  return (WIDGET_KEYS as readonly string[]).includes(value);
}

// Used both when saving a new selection (API route) and when rendering a
// stored one that might predate a catalog change  -  de-dupes, drops unknown
// keys, caps at MAX_WIDGETS, and falls back to the default set rather than
// ever rendering an empty overview.
export function sanitizeWidgetKeys(keys: unknown): WidgetKey[] {
  if (!Array.isArray(keys)) {
    return DEFAULT_WIDGETS;
  }
  const seen = new Set<string>();
  const result: WidgetKey[] = [];
  for (const key of keys) {
    if (typeof key === "string" && isWidgetKey(key) && !seen.has(key)) {
      seen.add(key);
      result.push(key);
      if (result.length >= MAX_WIDGETS) {
        break;
      }
    }
  }
  return result.length > 0 ? result : DEFAULT_WIDGETS;
}
