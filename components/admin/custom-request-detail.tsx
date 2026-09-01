"use client";

import Image from "next/image";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";
import {ArrowLeft, Loader2, Mail, MessageCircle, Send, Trash2, X} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {toWhatsAppLink} from "@/lib/contact";
import {
  adminSettableStatuses,
  customRequestStatusLabels,
  customRequestStatusStepDescriptions,
  customRequestStatusSteps,
  summariseConfig,
  type CustomRequestStatus
} from "@/lib/custom-studio";
import {ESTIMATE_DISCLAIMER} from "@/lib/custom-pricing";
import type {AdminCustomRequestView} from "@/lib/custom-requests";
import {StatusStepper} from "@/components/status-stepper";
import {PillDropdown} from "./pill-dropdown";
import {StatusBadge} from "./custom-requests-panel";
import {Toast, ToastState} from "./toast";
import {useConfirm} from "./use-confirm";

// Mirrors customRequestStatusStyle's colours (lib/custom-studio.ts) as
// static Tailwind arbitrary-value classes  -  PillDropdown takes a
// className, not a style object, and Tailwind's build-time scanner needs
// the literal class strings in source to generate them, not a value
// computed at runtime from the same palette.
const statusDropdownPillClassName: Record<CustomRequestStatus, string> = {
  draft: "bg-[#EFEDE6] text-[#4B4A42] hover:brightness-95",
  submitted: "bg-[#DCE6EA] text-[#2A3D42] hover:brightness-95",
  under_review: "bg-[#DCE6EA] text-[#2A3D42] hover:brightness-95",
  approved: "bg-[#DDE8DA] text-[#2F4A2C] hover:brightness-95",
  completed: "bg-[#DDE8DA] text-[#2F4A2C] hover:brightness-95",
  cancelled: "bg-[#F0DEE0] text-[#5C2E33] hover:brightness-95"
};

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"}) : "-";
}

function Card({title, action, children}: {title: string; action?: React.ReactNode; children: React.ReactNode}) {
  return (
    <div className="card space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-forest-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
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

// Cancelled isn't a step on the main happy path (see customRequestStatusSteps
// in lib/custom-studio.ts)  -  a request doesn't pass through it on the way
// to Completed  -  so it gets its own banner instead of pretending to be a
// fifth stop the shared StatusStepper would need to know about.
function RequestStatusTracker({status}: {status: CustomRequestStatus}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-[#DEBBBF] bg-[#F0DEE0] px-4 py-3 text-sm font-medium text-[#5C2E33]">
        This request was cancelled and is no longer active.
      </div>
    );
  }

  const currentIndex = Math.max(0, customRequestStatusSteps.indexOf(status as (typeof customRequestStatusSteps)[number]));
  return <StatusStepper steps={customRequestStatusSteps.map((step) => customRequestStatusLabels[step])} currentIndex={currentIndex} />;
}

function EmailComposeForm({
  request,
  onSent,
  onError,
  onClose
}: {
  request: AdminCustomRequestView;
  onSent: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
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
      onSent();
      onClose();
    } catch {
      onError("Could not reach the mail service.");
    } finally {
      setSending(false);
    }
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
          onClick={onClose}
          disabled={sending}
          className="rounded-full border border-[#d4c5ab] px-4 py-2.5 text-sm font-medium text-forest-700 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Email and WhatsApp are the studio's two real contact channels, given
// equal visual weight side by side  -  a customer's preferred channel isn't
// implied by which button happens to look more important. No mailto
// fallback: the email side already opens a real send-from-the-app
// composer, so a second "or open in your own mail app" link was just a
// second way to do the same thing with none of the delivery tracking.
function ContactActions({
  request,
  onSent,
  onError
}: {
  request: AdminCustomRequestView;
  onSent: () => void;
  onError: (message: string) => void;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const whatsapp = request.customer.phone ? toWhatsAppLink(request.customer.phone) : null;

  if (composerOpen) {
    return (
      <EmailComposeForm
        request={request}
        onSent={onSent}
        onError={onError}
        onClose={() => setComposerOpen(false)}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        disabled={!request.customer.email}
        className="button-lift flex h-11 items-center justify-center gap-2 rounded-full bg-forest-900 px-3 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mail className="h-4 w-4" />
        Email
      </button>
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="button-lift flex h-11 items-center justify-center gap-2 rounded-full border border-[#d4c5ab] bg-[#fffdf9] px-3 text-sm font-semibold text-forest-800"
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
      ) : (
        <span className="flex h-11 items-center justify-center rounded-full border border-dashed border-[#d4c5ab] px-3 text-center text-xs text-forest-400">
          No phone on file
        </span>
      )}
    </div>
  );
}

export function CustomRequestDetail({initial}: {initial: AdminCustomRequestView}) {
  const router = useRouter();
  const [request, setRequest] = useState(initial);
  const [toast, setToast] = useState<ToastState>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const {confirm, dialog: confirmDialog} = useConfirm();

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

  async function deleteRequest() {
    if (
      !(await confirm({
        title: `Delete ${request.requestRef}?`,
        description: "This permanently removes the request and its attached photos. This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger"
      }))
    ) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/custom-requests/${request.id}`, {method: "DELETE"});
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setToast({type: "error", message: data?.error ?? "Could not delete the request."});
        setDeleting(false);
        return;
      }
      router.push("/mimin/custom-requests");
    } catch {
      setToast({type: "error", message: "Could not reach the server. Please try again."});
      setDeleting(false);
    }
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
  const statusOptions = adminSettableStatuses.map((status) => ({value: status, label: customRequestStatusLabels[status]}));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/mimin/custom-requests"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-forest-600 hover:text-forest-900"
          >
            <ArrowLeft className="h-4 w-4" />
            All custom requests
          </Link>
          <button
            type="button"
            onClick={() => void deleteRequest()}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {deleting ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-forest-900">{request.requestRef}</h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 text-sm text-forest-500">
          {request.productType} · submitted {formatDateTime(request.submittedAt)} · last updated{" "}
          {formatDateTime(request.updatedAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Customer">
          <div className="space-y-1">
            <p className="text-sm font-medium text-forest-900">{request.customer.name ?? "-"}</p>
            <p className="text-sm text-forest-600">{request.customer.email ?? "No email on file"}</p>
            <p className="text-sm text-forest-600">{request.customer.phone ?? "No phone on file"}</p>
          </div>
          <ContactActions
            request={request}
            onSent={() => setToast({type: "success", message: "Email sent to the customer."})}
            onError={(message) => setToast({type: "error", message})}
          />
        </Card>

        <Card title="Design Summary">
          <dl className="divide-y divide-[#eee7d8] rounded-xl border border-[#e7ddc6] bg-[#fffdf9]">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                <dt className="text-sm text-forest-500">{row.label}</dt>
                <dd className="text-right text-sm font-medium text-forest-900">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card
          title="Request Status"
          action={
            <PillDropdown
              value={request.status === "draft" ? "submitted" : request.status}
              options={statusOptions}
              pillClassName={statusDropdownPillClassName[request.status]}
              disabled={savingStatus}
              align="right"
              onChange={(value) => void changeStatus(value)}
            />
          }
        >
          <RequestStatusTracker status={request.status} />
          <p className="text-xs leading-relaxed text-forest-500">{customRequestStatusStepDescriptions[request.status]}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title={`Inspiration Photos${request.images.length ? ` (${request.images.length})` : ""}`}>
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
        </Card>

        <Card title="Pricing">
          <div className="rounded-xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500">Estimate shown to customer</p>
            <p className="mt-1 font-display text-lg text-forest-900">
              {request.estimatedPriceIdr > 0 ? formatCurrency(request.estimatedPriceIdr, "IDR") : "Not priced"}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-forest-500">{ESTIMATE_DISCLAIMER}</p>
          </div>

          <div className="rounded-xl bg-forest-900 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sand-200/80">Final price</p>
            <p className="mt-1 font-display text-2xl text-sand-50">
              {request.finalPriceIdr !== null ? formatCurrency(request.finalPriceIdr, "IDR") : "Not yet quoted"}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-forest-500" htmlFor="final-price">
              Set final price (IDR)
            </label>
            <div className="flex gap-2">
              <input
                id="final-price"
                value={finalPrice}
                inputMode="numeric"
                onChange={(event) => setFinalPrice(event.target.value)}
                placeholder="Leave blank until quoted"
                className="w-full min-w-0 rounded-full border border-[#d4c5ab] bg-white px-4 py-2 text-sm text-forest-900 outline-none focus:border-forest-400"
              />
              <button
                type="button"
                onClick={() => void saveFinalPrice()}
                disabled={savingPrice || finalPrice.trim() === (request.finalPriceIdr !== null ? String(request.finalPriceIdr) : "")}
                className="button-lift shrink-0 rounded-full bg-forest-900 px-5 py-2 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPrice ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Customer Notes">
          {request.notes?.trim() ? (
            <p className="whitespace-pre-wrap rounded-xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3 text-sm leading-relaxed text-forest-800">
              {request.notes}
            </p>
          ) : (
            <p className="text-sm text-forest-500">No notes were left.</p>
          )}
        </Card>

        <Card title="Internal Notes" action={<span className="text-xs text-forest-400">Never shown to the customer</span>}>
          <textarea
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            rows={4}
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
        </Card>
      </div>

      {lightbox ? <Lightbox url={lightbox} onClose={() => setLightbox(null)} /> : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      {confirmDialog}
    </div>
  );
}
