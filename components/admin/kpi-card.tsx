import Link from "next/link";
import type {Route} from "next";
import {ArrowDown, ArrowUp} from "lucide-react";

export type DeltaTone = "up" | "down" | "flat" | "none";
export type Delta = {text: string; tone: DeltaTone};

// A delta is only ever shown as a real comparison when both sides have
// something to compare — "all time" has no previous period, and a previous
// value of 0 makes a percentage change undefined, not "infinite growth."
export function percentDelta(current: number, previous: number | null): Delta | null {
  if (previous === null || previous === 0) {
    return null;
  }
  const change = ((current - previous) / previous) * 100;
  if (change === 0) {
    return {text: "no change vs previous period", tone: "flat"};
  }
  return {
    text: `${change > 0 ? "+" : ""}${change.toFixed(1)}% vs previous period`,
    tone: change > 0 ? "up" : "down"
  };
}

export function countDelta(current: number, previous: number | null): Delta | null {
  if (previous === null) {
    return null;
  }
  const change = current - previous;
  if (change === 0) {
    return {text: "no change vs previous period", tone: "flat"};
  }
  return {text: `${change > 0 ? "+" : ""}${change} vs previous period`, tone: change > 0 ? "up" : "down"};
}

export function DeltaLine({delta, loading}: {delta: Delta | null; loading: boolean}) {
  if (loading || !delta) {
    return null;
  }
  const toneClass = delta.tone === "up" ? "text-[#3f7a4a]" : delta.tone === "down" ? "text-[#a4402b]" : "text-forest-500";
  return (
    <p className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${toneClass}`}>
      {delta.tone === "up" ? <ArrowUp className="h-3 w-3" /> : delta.tone === "down" ? <ArrowDown className="h-3 w-3" /> : null}
      {delta.text}
    </p>
  );
}

// Every card: icon in its own generously-padded circle (never clipped),
// content stacked top-down (not centered as a block) so the alignment
// discipline holds regardless of label/delta length. Shared between the
// admin dashboard's own KPI row and the account page's admin overview
// (and, per-admin, its configurable widgets) — one premium card language
// for every number-in-a-card surface in the admin experience, not a
// separate visual style per page.
export function KpiCard({
  icon: Icon,
  iconTone = "neutral",
  label,
  value,
  subtext,
  delta,
  loading,
  href
}: {
  icon: React.ComponentType<{className?: string}>;
  iconTone?: "neutral" | "amber" | "red" | "green";
  label: string;
  value: string;
  subtext?: string;
  delta?: Delta | null;
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
      {delta !== undefined ? <DeltaLine delta={delta ?? null} loading={loading} /> : null}
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
