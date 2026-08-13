"use client";

import {useCallback, useEffect, useMemo, useState} from "react";
import {CalendarRange} from "lucide-react";

type DayRow = {date: string; count: number; totalIdr: number};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return {start: toIsoDate(start), end: toIsoDate(end)};
}

// Every calendar day in [start, end], YYYY-MM-DD, so the chart's x-axis is
// complete even though the API only returns rows for days that actually
// had orders — days with none render as a real zero-height bar instead of
// just not existing on the axis.
function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    days.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {month: "short", day: "numeric"});
}

const PRESETS = [
  {label: "7d", days: 7},
  {label: "30d", days: 30},
  {label: "90d", days: 90}
];

export function OrdersChart() {
  const [range, setRange] = useState(defaultRange);
  const [rows, setRows] = useState<DayRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders-per-day?start=${start}&end=${end}`, {cache: "no-store"});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error ?? "Could not load order data.");
        setRows(null);
        return;
      }
      setRows(Array.isArray(data.days) ? data.days : []);
    } catch {
      setError("Could not reach the server.");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(range.start, range.end);
  }, [range, loadData]);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    setRange({start: toIsoDate(start), end: toIsoDate(end)});
  }

  const countByDate = useMemo(() => {
    const map = new Map<string, DayRow>();
    (rows ?? []).forEach((row) => map.set(row.date, row));
    return map;
  }, [rows]);

  const allDays = useMemo(() => enumerateDays(range.start, range.end), [range]);
  const maxCount = Math.max(1, ...allDays.map((day) => countByDate.get(day)?.count ?? 0));
  const totalOrders = allDays.reduce((sum, day) => sum + (countByDate.get(day)?.count ?? 0), 0);
  const hasAnyOrders = totalOrders > 0;

  // Sparse x-axis labels: showing one per day for a 90-day range is just
  // noise, so only ever label a handful of evenly-spaced points.
  const labelEvery = Math.max(1, Math.ceil(allDays.length / 8));

  return (
    <div className="card space-y-5 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-2xl text-forest-900">Orders per day</h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-[#d4c5ab]">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className="px-3 py-1.5 text-xs font-semibold text-forest-700 transition-colors duration-150 hover:bg-[#f0e7d4]"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-[#d4c5ab] bg-[#fffdf9] px-3 py-1.5">
            <CalendarRange className="h-3.5 w-3.5 text-forest-500" />
            <input
              type="date"
              value={range.start}
              max={range.end}
              onChange={(event) => setRange((current) => ({...current, start: event.target.value}))}
              className="bg-transparent text-xs text-forest-800 outline-none"
            />
            <span className="text-xs text-forest-400">–</span>
            <input
              type="date"
              value={range.end}
              min={range.start}
              max={toIsoDate(new Date())}
              onChange={(event) => setRange((current) => ({...current, end: event.target.value}))}
              className="bg-transparent text-xs text-forest-800 outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-forest-600">Loading...</p>
      ) : error ? (
        <p className="py-16 text-center text-sm text-red-700">{error}</p>
      ) : !hasAnyOrders ? (
        <p className="py-16 text-center text-sm text-forest-600">No orders in this period.</p>
      ) : (
        <div>
          <p className="mb-4 text-sm text-forest-600">
            <span className="font-display text-xl text-forest-900">{totalOrders}</span> order{totalOrders === 1 ? "" : "s"} across{" "}
            {allDays.length} day{allDays.length === 1 ? "" : "s"}
          </p>
          <svg viewBox={`0 0 ${allDays.length * 12} 140`} className="h-40 w-full overflow-visible" preserveAspectRatio="none">
            {allDays.map((day, index) => {
              const count = countByDate.get(day)?.count ?? 0;
              const barHeight = count === 0 ? 0 : Math.max(3, (count / maxCount) * 110);
              return (
                <g key={day}>
                  <title>
                    {formatShortDate(day)}: {count} order{count === 1 ? "" : "s"}
                  </title>
                  <rect
                    x={index * 12 + 2}
                    y={120 - barHeight}
                    width={8}
                    height={barHeight || 1}
                    rx={2}
                    className={count > 0 ? "fill-forest-700" : "fill-[#e4d9c1]"}
                  />
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex text-[10px] text-forest-500" style={{fontVariantNumeric: "tabular-nums"}}>
            {allDays.map((day, index) => (
              <div key={day} style={{width: `${100 / allDays.length}%`}} className="text-center">
                {index % labelEvery === 0 ? formatShortDate(day) : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
