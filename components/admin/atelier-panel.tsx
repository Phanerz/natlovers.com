"use client";

import {useState} from "react";
import {Download} from "lucide-react";
import {Toast, ToastState} from "./toast";

type Limits = {
  piecesMonthlyCap: number;
  piecesMaxPerOrder: number;
  extrasMaxPerOrder: number;
  extrasMonthlyCap: number | null;
  wholesaleContactUrl: string | null;
};

type LogRow = {id: string; setting: string; oldValue: string | null; newValue: string | null; changedByEmail: string; changedAt: string};

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-white px-3.5 py-2.5 text-sm text-forest-900 outline-none focus:border-forest-400";

export function AtelierPanel({
  monthLabel,
  limits,
  piecesUsed,
  extrasUsed,
  waitingCount,
  log,
  setupError
}: {
  monthLabel: string;
  limits: Limits;
  piecesUsed: number;
  extrasUsed: number;
  waitingCount: number;
  log: LogRow[];
  setupError: string | null;
}) {
  const [form, setForm] = useState({
    piecesMonthlyCap: String(limits.piecesMonthlyCap),
    piecesMaxPerOrder: String(limits.piecesMaxPerOrder),
    extrasMaxPerOrder: String(limits.extrasMaxPerOrder),
    extrasMonthlyCap: limits.extrasMonthlyCap != null ? String(limits.extrasMonthlyCap) : "",
    wholesaleContactUrl: limits.wholesaleContactUrl ?? ""
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [rows, setRows] = useState(log);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/atelier", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(form)
      });
      const payload = await response.json();
      if (!response.ok) {
        setToast({type: "error", message: payload?.error ?? "Could not save the limits."});
        return;
      }
      setToast({type: "success", message: "Limits saved."});
      // Reload so the change log shows the new entries.
      window.location.reload();
    } catch {
      setToast({type: "error", message: "Could not save the limits."});
    } finally {
      setSaving(false);
      void setRows;
    }
  }

  return (
    <div className="space-y-6">
      {setupError ? <p className="card p-4 text-sm text-[#8a4a1f]">{setupError}</p> : null}

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl text-forest-900">This month, {monthLabel}</h2>
        <p className="text-sm text-forest-600">
          Counted: orders awaiting transfer that have not expired, paid orders and shipped orders. Cancelled and expired orders free
          their places. Calendar months follow Jakarta time.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#d4c5ab] p-4">
            <p className="muted">Pieces (bags and apparel)</p>
            <p className="mt-1 font-display text-3xl text-forest-900">
              {piecesUsed} <span className="text-lg text-forest-500">of {limits.piecesMonthlyCap}</span>
            </p>
          </div>
          <div className="rounded-xl border border-[#d4c5ab] p-4">
            <p className="muted">Atelier extras (dolls, accessories, add-ons)</p>
            <p className="mt-1 font-display text-3xl text-forest-900">
              {extrasUsed}{" "}
              <span className="text-lg text-forest-500">{limits.extrasMonthlyCap != null ? `of ${limits.extrasMonthlyCap}` : "no monthly cap"}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-xl text-forest-900">Limits</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1 text-sm text-forest-700">
            <span className="muted">Pieces per month</span>
            <input type="number" min={1} value={form.piecesMonthlyCap} onChange={(e) => setForm({...form, piecesMonthlyCap: e.target.value})} className={fieldClass} />
          </label>
          <label className="block space-y-1 text-sm text-forest-700">
            <span className="muted">Pieces per order</span>
            <input type="number" min={1} value={form.piecesMaxPerOrder} onChange={(e) => setForm({...form, piecesMaxPerOrder: e.target.value})} className={fieldClass} />
          </label>
          <label className="block space-y-1 text-sm text-forest-700">
            <span className="muted">Extras per order</span>
            <input type="number" min={1} value={form.extrasMaxPerOrder} onChange={(e) => setForm({...form, extrasMaxPerOrder: e.target.value})} className={fieldClass} />
          </label>
          <label className="block space-y-1 text-sm text-forest-700">
            <span className="muted">Extras per month (leave empty for no cap)</span>
            <input type="number" min={1} value={form.extrasMonthlyCap} onChange={(e) => setForm({...form, extrasMonthlyCap: e.target.value})} className={fieldClass} />
          </label>
          <label className="block space-y-1 text-sm text-forest-700 sm:col-span-2">
            <span className="muted">Contact link for larger orders (web address or mailto, empty for none)</span>
            <input type="url" value={form.wholesaleContactUrl} onChange={(e) => setForm({...form, wholesaleContactUrl: e.target.value})} placeholder="https://" className={fieldClass} />
          </label>
        </div>
        <button type="button" onClick={save} disabled={saving} className="glass-btn-secondary rounded-full px-6 py-2.5 text-sm font-semibold text-forest-900 disabled:opacity-60">
          {saving ? "Saving..." : "Save limits"}
        </button>
      </section>

      <section className="card space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-forest-900">Waiting list</h2>
          <a href="/api/admin/atelier/waiting-list" className="inline-flex items-center gap-2 rounded-full border border-[#d4c5ab] px-4 py-2 text-sm font-medium text-forest-800">
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </a>
        </div>
        <p className="text-sm text-forest-600">{waitingCount} {waitingCount === 1 ? "person is" : "people are"} waiting (not counting anyone who has unsubscribed).</p>
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-display text-xl text-forest-900">Changes to limits</h2>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-forest-800">
              <thead>
                <tr className="text-xs uppercase tracking-[0.16em] text-forest-500">
                  <th className="py-2 pr-4">When</th>
                  <th className="py-2 pr-4">Who</th>
                  <th className="py-2 pr-4">Setting</th>
                  <th className="py-2 pr-4">Old</th>
                  <th className="py-2">New</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-[#e6dcc4]">
                    <td className="py-2 pr-4 whitespace-nowrap">{new Date(row.changedAt).toLocaleString("en-GB", {timeZone: "Asia/Jakarta"})}</td>
                    <td className="py-2 pr-4">{row.changedByEmail}</td>
                    <td className="py-2 pr-4">{row.setting}</td>
                    <td className="py-2 pr-4">{row.oldValue ?? "none"}</td>
                    <td className="py-2">{row.newValue ?? "none"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-forest-600">No changes yet.</p>
        )}
      </section>
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
