"use client";

import Link from "next/link";
import {useCallback, useEffect, useMemo, useState} from "react";
import {ArrowUpRight, Loader2, PauseCircle, PlayCircle} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {
  customRequestStatusLabels,
  customRequestStatuses,
  customRequestStatusStyle,
  type CustomRequestStatus
} from "@/lib/custom-studio";
import type {AdminCustomRequestView} from "@/lib/custom-requests";
import type {StoreSettings} from "@/lib/store-settings";
import {DEFAULT_PAGE_SIZE, PageSize, PaginationBar} from "./pagination-bar";
import {Toast, ToastState} from "./toast";

// Reuses the Orders panel's table shape and the catalogue's pill styling so
// the studio queue reads like the rest of the admin panel rather than a
// separate application bolted on.

export function StatusBadge({status}: {status: CustomRequestStatus}) {
  const style = customRequestStatusStyle[status];
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
      style={{backgroundColor: style.bg, borderColor: style.border, color: style.text}}
    >
      {customRequestStatusLabels[status]}
    </span>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, {dateStyle: "medium"}) : "-";
}

// The capacity guardrail. Deliberately prominent rather than buried in a
// settings page: closing intake is a decision the studio makes when they are
// at capacity, and they should be able to reach it from the queue that told
// them so.
function IntakeToggle({
  settings,
  onChange
}: {
  settings: StoreSettings;
  onChange: (settings: StoreSettings) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(settings.customIntakePausedMessage);
  const [error, setError] = useState<string | null>(null);

  async function toggle(paused: boolean) {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/custom-requests", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({customIntakePaused: paused, customIntakePausedMessage: message})
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(typeof payload?.error === "string" ? payload.error : "Could not update the setting.");
        return;
      }
      onChange(payload.settings as StoreSettings);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const paused = settings.customIntakePaused;

  return (
    <div
      className={`card space-y-3 p-6 ${paused ? "border-[#e0b89f]" : ""}`}
      style={paused ? {background: "rgba(253, 241, 236, 0.9)"} : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-forest-900">
            {paused ? "Custom intake is paused" : "Custom intake is open"}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-forest-600">
            {paused
              ? "Customers see your pause message instead of the studio. Drafts they've already started are untouched."
              : "Customers can design and send new commissions. Pause this when the workshop is at capacity."}
          </p>
          {settings.updatedByEmail ? (
            <p className="mt-1.5 text-xs text-forest-400">
              Last changed by {settings.updatedByEmail} on {formatDate(settings.updatedAt)}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => void toggle(!paused)}
          disabled={saving}
          className={`button-lift flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            paused ? "bg-forest-900 text-sand-50" : "border border-[#d4c5ab] bg-[#fffdf9] text-forest-800"
          }`}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : paused ? (
            <PlayCircle className="h-4 w-4" />
          ) : (
            <PauseCircle className="h-4 w-4" />
          )}
          {paused ? "Reopen intake" : "Pause intake"}
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500" htmlFor="pause-message">
          Message shown while paused
        </label>
        <input
          id="pause-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onBlur={() => {
            if (message !== settings.customIntakePausedMessage) void toggle(paused);
          }}
          className="w-full rounded-full border border-[#d4c5ab] bg-white px-4 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
        />
      </div>

      {error ? <p className="text-sm text-[#a4553c]">{error}</p> : null}
    </div>
  );
}

export function CustomRequestsPanel() {
  const [requests, setRequests] = useState<AdminCustomRequestView[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [filter, setFilter] = useState<CustomRequestStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/custom-requests?status=${filter}`, {cache: "no-store"});
      if (!response.ok) {
        setToast({type: "error", message: "Could not load custom requests."});
        return;
      }
      const payload = await response.json();
      setRequests(payload.requests ?? []);
      setSettings(payload.settings ?? null);
    } catch {
      setToast({type: "error", message: "Could not reach the server."});
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(requests.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => requests.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [requests, currentPage, pageSize]
  );

  // Counts come from the loaded rows when showing everything. Under a filter
  // the panel only holds that one status, so the tabs show no counts rather
  // than numbers that would silently mean "of the filtered set".
  const counts =
    filter === "all"
      ? requests.reduce<Record<string, number>>((acc, request) => {
          acc[request.status] = (acc[request.status] ?? 0) + 1;
          return acc;
        }, {})
      : null;

  return (
    <div className="space-y-6">
      {settings ? <IntakeToggle settings={settings} onChange={setSettings} /> : null}

      <div className="card space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-forest-900">Custom Requests</h2>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-forest-400" /> : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === "all"
                ? "border-forest-900 bg-forest-900 text-sand-50"
                : "border-[#d4c5ab] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
            }`}
          >
            All{counts ? ` (${requests.length})` : ""}
          </button>
          {customRequestStatuses
            .filter((status) => status !== "draft")
            .map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  filter === status
                    ? "border-forest-900 bg-forest-900 text-sand-50"
                    : "border-[#d4c5ab] bg-[#fffdf9] text-forest-700 hover:border-forest-400"
                }`}
              >
                {customRequestStatusLabels[status]}
                {counts?.[status] ? ` (${counts[status]})` : ""}
              </button>
            ))}
        </div>

        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                  <th className="pb-3 pr-3">Reference</th>
                  <th className="pb-3 pr-3">Customer</th>
                  <th className="pb-3 pr-3">Type</th>
                  <th className="pb-3 pr-3">Submitted</th>
                  <th className="pb-3 pr-3">Estimated</th>
                  <th className="pb-3 pr-3">Status</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((request) => (
                  <tr key={request.id} className="border-t border-[#e7ddc6]">
                    <td className="py-3 pr-3">
                      <Link
                        href={`/mimin/custom-requests/${request.id}`}
                        className="font-display text-base text-forest-900 hover:underline"
                      >
                        {request.requestRef}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="block text-forest-900">{request.customer.name ?? "-"}</span>
                      <span className="block text-xs text-forest-500">{request.customer.email}</span>
                    </td>
                    <td className="py-3 pr-3 text-forest-700">{request.productType}</td>
                    <td className="py-3 pr-3 text-forest-700">{formatDate(request.submittedAt)}</td>
                    <td className="py-3 pr-3 text-forest-900">
                      {request.finalPriceIdr !== null ? (
                        <>
                          <span className="font-medium">{formatCurrency(request.finalPriceIdr, "IDR")}</span>
                          <span className="block text-xs text-forest-400">quoted</span>
                        </>
                      ) : request.estimatedPriceIdr > 0 ? (
                        <>
                          <span>{formatCurrency(request.estimatedPriceIdr, "IDR")}</span>
                          <span className="block text-xs text-forest-400">estimate</span>
                        </>
                      ) : (
                        <span className="text-forest-400">To quote</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/mimin/custom-requests/${request.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-forest-700 hover:text-forest-900"
                      >
                        Open
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-forest-500">
            {loading
              ? "Loading..."
              : filter === "all"
                ? "No custom requests yet."
                : `No requests with status "${customRequestStatusLabels[filter]}".`}
          </p>
        )}

        {requests.length ? (
          <PaginationBar
            page={currentPage}
            totalPages={totalPages}
            totalItems={requests.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        ) : null}
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
