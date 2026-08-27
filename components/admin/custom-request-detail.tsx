"use client";

import Image from "next/image";
import Link from "next/link";
import {useEffect, useState} from "react";
import {ArrowLeft, Loader2, Mail, MessageCircle, Send, X} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {toMailtoLink, toWhatsAppLink} from "@/lib/contact";
import {
  adminSettableStatuses,
  customRequestStatusLabels,
  summariseConfig,
  type CustomRequestStatus
} from "@/lib/custom-studio";
import {ESTIMATE_DISCLAIMER} from "@/lib/custom-pricing";
import type {AdminCustomRequestView} from "@/lib/custom-requests";
import {StatusBadge} from "./custom-requests-panel";
import {Toast, ToastState} from "./toast";

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"}) : "-";
}

// Full-size viewing for inspiration photos. The studio needs to actually see
// what was sent, which a 64px thumbnail does not allow.
function Lightbox({url, onClose}: {url: string; onClose: () => void}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inspiration photo"
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-forest-900/85 p-6 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sand-50"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative h-[82vh] w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <Image src={url} alt="Inspiration photo" fill sizes="100vw" className="object-contain" />
      </div>
    </div>
  );
}

function MessageComposer({
  request,
  onSent,
  onError
}: {
  request: AdminCustomRequestView;
  onSent: () => void;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(`About your custom request ${request.requestRef ?? ""}`);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    try {
      const response = await fetch(`/api/admin/custom-requests/${request.id}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({subject, message})
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        onError(typeof payload?.error === "string" ? payload.error : "Could not send the message.");
        return;
      }
      setMessage("");
      setOpen(false);
      onSent();
    } catch {
      onError("Could not reach the mail service.");
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!request.customer.email}
        className="button-lift flex items-center justify-center gap-2 rounded-full bg-forest-900 px-4 py-2.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        Email customer
      </button>
    );
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-[#e7ddc6] bg-[#fffdf9] p-4">
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="Subject"
        className="w-full rounded-full border border-[#d4c5ab] bg-white px-4 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
      />
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={6}
        placeholder="Write to the customer in your own words..."
        className="w-full resize-none rounded-lg border border-[#d4c5ab] bg-white px-4 py-3 text-sm leading-relaxed text-forest-900 outline-none focus:border-forest-400"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !subject.trim() || !message.trim()}
          className="button-lift flex flex-1 items-center justify-center gap-2 rounded-full bg-forest-900 px-4 py-2.5 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Sending..." : "Send email"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={sending}
          className="rounded-full border border-[#d4c5ab] px-4 py-2.5 text-sm font-medium text-forest-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function CustomRequestDetail({initial}: {initial: AdminCustomRequestView}) {
  const [request, setRequest] = useState(initial);
  const [toast, setToast] = useState<ToastState>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [finalPrice, setFinalPrice] = useState(request.finalPriceIdr !== null ? String(request.finalPriceIdr) : "");
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [savingPrice, setSavingPrice] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    const response = await fetch(`/api/admin/custom-requests/${request.id}`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setToast({type: "error", message: typeof payload?.error === "string" ? payload.error : "Could not save."});
      return false;
    }
    setRequest(payload.request as AdminCustomRequestView);
    return true;
  }

  async function changeStatus(status: CustomRequestStatus) {
    setSavingStatus(true);
    const ok = await patch({status});
    if (ok) setToast({type: "success", message: `Status set to ${customRequestStatusLabels[status]}.`});
    setSavingStatus(false);
  }

  async function saveFinalPrice() {
    setSavingPrice(true);
    // An empty field clears the quote rather than saving zero  -  see the
    // nullable/optional split on adminUpdateSchema.
    const trimmed = finalPrice.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setToast({type: "error", message: "Enter a valid amount in IDR, or clear the field."});
      setSavingPrice(false);
      return;
    }

    const ok = await patch({finalPriceIdr: parsed === null ? null : Math.round(parsed)});
    if (ok) setToast({type: "success", message: parsed === null ? "Quote cleared." : "Final price saved."});
    setSavingPrice(false);
  }

  async function saveNotes() {
    setSavingNotes(true);
    const ok = await patch({adminNotes});
    if (ok) setToast({type: "success", message: "Internal notes saved."});
    setSavingNotes(false);
  }

  const rows = summariseConfig(request.configuration);
  const whatsapp = request.customer.phone ? toWhatsAppLink(request.customer.phone) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/mimin/custom-requests"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-600 hover:text-forest-900"
        >
          <ArrowLeft className="h-4 w-4" />
          All custom requests
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-forest-900">{request.requestRef}</h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 text-sm text-forest-500">
          {request.productType} · submitted {formatDateTime(request.submittedAt)} · last updated{" "}
          {formatDateTime(request.updatedAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="card space-y-4 p-6 sm:p-8">
            <h2 className="font-display text-xl text-forest-900">Configuration</h2>
            <dl className="divide-y divide-[#eee7d8] rounded-xl border border-[#e7ddc6] bg-[#fffdf9]">
              {rows.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <dt className="text-sm text-forest-500">{row.label}</dt>
                  <dd className="text-right text-sm font-medium text-forest-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card space-y-4 p-6 sm:p-8">
            <h2 className="font-display text-xl text-forest-900">
              Inspiration photos {request.images.length ? `(${request.images.length})` : ""}
            </h2>
            {request.images.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {request.images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setLightbox(image.url)}
                    className="relative aspect-square overflow-hidden rounded-xl border border-[#d9ccb3] bg-[#f2ecdc] transition-transform duration-200 hover:scale-[1.02]"
                  >
                    <Image src={image.url} alt="Inspiration" fill sizes="200px" className="object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-forest-500">The customer didn&apos;t attach any photos.</p>
            )}
          </div>

          <div className="card space-y-3 p-6 sm:p-8">
            <h2 className="font-display text-xl text-forest-900">Customer notes</h2>
            {request.notes?.trim() ? (
              <p className="whitespace-pre-wrap rounded-xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3 text-sm leading-relaxed text-forest-800">
                {request.notes}
              </p>
            ) : (
              <p className="text-sm text-forest-500">No notes were left.</p>
            )}
          </div>

          <div className="card space-y-3 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl text-forest-900">Internal notes</h2>
              <span className="text-xs text-forest-400">Never shown to the customer</span>
            </div>
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              rows={5}
              placeholder="Notes for the studio: materials on hand, who's making it, what was agreed on the phone..."
              className="w-full resize-none rounded-lg border border-[#d4c5ab] bg-white px-4 py-3 text-sm leading-relaxed text-forest-900 outline-none focus:border-forest-400"
            />
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={savingNotes || adminNotes === (request.adminNotes ?? "")}
              className="button-lift rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingNotes ? "Saving..." : "Save notes"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="font-display text-xl text-forest-900">Customer</h2>
            <div className="space-y-1">
              <p className="text-sm font-medium text-forest-900">{request.customer.name ?? "-"}</p>
              <p className="text-sm text-forest-600">{request.customer.email ?? "No email on file"}</p>
              <p className="text-sm text-forest-600">{request.customer.phone ?? "No phone on file"}</p>
            </div>

            <div className="space-y-2">
              <MessageComposer
                request={request}
                onSent={() => setToast({type: "success", message: "Email sent to the customer."})}
                onError={(message) => setToast({type: "error", message})}
              />

              {/* WhatsApp is how this studio actually talks to most of its
                  customers, so it sits alongside email rather than behind it.
                  A deep link, not an integration  -  no message is sent on the
                  admin's behalf. */}
              {whatsapp ? (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="button-lift flex items-center justify-center gap-2 rounded-full border border-[#d4c5ab] bg-[#fffdf9] px-4 py-2.5 text-sm font-medium text-forest-800"
                >
                  <MessageCircle className="h-4 w-4" />
                  Open WhatsApp
                </a>
              ) : null}

              {request.customer.email ? (
                <a
                  href={toMailtoLink(request.customer.email, `About your custom request ${request.requestRef ?? ""}`)}
                  className="block text-center text-xs text-forest-500 hover:text-forest-800"
                >
                  or open in your own mail app
                </a>
              ) : null}
            </div>
          </div>

          <div className="card space-y-3 p-6">
            <h2 className="font-display text-xl text-forest-900">Status</h2>
            <div className="flex flex-wrap gap-1.5">
              {adminSettableStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void changeStatus(status)}
                  disabled={savingStatus || status === request.status}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                    status === request.status
                      ? "border-forest-900 bg-forest-900 text-sand-50 opacity-100"
                      : "border-[#d4c5ab] bg-[#fffdf9] text-forest-700 hover:border-forest-400 disabled:opacity-50"
                  }`}
                >
                  {customRequestStatusLabels[status]}
                </button>
              ))}
            </div>
          </div>

          <div className="card space-y-3 p-6">
            <h2 className="font-display text-xl text-forest-900">Pricing</h2>

            <div className="rounded-xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">
                Estimate shown to customer
              </p>
              <p className="mt-1 font-display text-lg text-forest-900">
                {request.estimatedPriceIdr > 0 ? formatCurrency(request.estimatedPriceIdr, "IDR") : "Not priced"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-forest-500">{ESTIMATE_DISCLAIMER}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500" htmlFor="final-price">
                Final price (IDR)
              </label>
              <input
                id="final-price"
                value={finalPrice}
                inputMode="numeric"
                onChange={(event) => setFinalPrice(event.target.value)}
                placeholder="Leave blank until quoted"
                className="w-full rounded-full border border-[#d4c5ab] bg-white px-4 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
              />
              <button
                type="button"
                onClick={() => void saveFinalPrice()}
                disabled={savingPrice || finalPrice.trim() === (request.finalPriceIdr !== null ? String(request.finalPriceIdr) : "")}
                className="button-lift w-full rounded-full bg-forest-900 px-4 py-2 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPrice ? "Saving..." : "Save final price"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {lightbox ? <Lightbox url={lightbox} onClose={() => setLightbox(null)} /> : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
