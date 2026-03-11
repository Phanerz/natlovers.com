"use client";

import {FormEvent, useState} from "react";
import {supportedCurrencies} from "@/lib/data";
import {Locale} from "@/lib/site";

type RequestState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const initialState: RequestState = {
  tone: "idle",
  message: ""
};

export function CustomRequestForm({locale}: {locale: Locale}) {
  const [status, setStatus] = useState<RequestState>(initialState);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(initialState);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/custom-request", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus({
          tone: "error",
          message:
            payload?.error
              ? "Please check the required fields and try again."
              : "Please review your details and try again."
        });
        return;
      }

      setStatus({
        tone: "success",
        message: payload?.message ?? "Request received. We will review it shortly."
      });
      form.reset();
    } catch {
      setStatus({
        tone: "error",
        message: "Something went wrong while sending your request. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid gap-4 p-6 md:grid-cols-2">
      <input name="name" placeholder="Name" required className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none" />
      <input name="email" type="email" placeholder="Email" required className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none" />
      <select
        name="preferredLocale"
        defaultValue={locale}
        className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none"
      >
        <option value="en">English</option>
        <option value="id">Bahasa Indonesia</option>
      </select>
      <select name="currency" defaultValue="IDR" className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none">
        {supportedCurrencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
      <input name="requestedSize" placeholder="Preferred size" className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none" />
      <input name="timeline" placeholder="Timeline" className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none" />
      <input name="budget" inputMode="numeric" placeholder="Budget" className="rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none" />
      <textarea
        name="inspiration"
        placeholder="Describe your idea, colours, motif, and story."
        required
        className="min-h-40 rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none md:col-span-2"
      />
      <textarea
        name="notes"
        placeholder="Anything else we should know?"
        className="min-h-32 rounded-2xl border border-forest-100 bg-white/80 px-4 py-3 outline-none md:col-span-2"
      />
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-forest-900 px-5 py-3 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Sending request..." : "Submit request"}
        </button>
        {status.message ? (
          <p className={`mt-3 text-sm ${status.tone === "error" ? "text-red-700" : "text-forest-700"}`}>
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

