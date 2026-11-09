"use client";

import {FormEvent, useId, useState} from "react";
import {copy, type Lang} from "@/lib/atelier-copy";

// Email only. The server checks the address, rate limits, and sends a confirmation with an
// unsubscribe link.
export function WaitingListForm({lang, className = ""}: {lang: Lang; className?: string}) {
  const t = copy[lang];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError(t.waitingListInvalid);
      return;
    }
    setError(null);
    setState("sending");
    try {
      const response = await fetch("/api/waiting-list", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email: trimmed, language: lang})
      });
      if (response.ok) {
        setState("done");
        return;
      }
      setState("idle");
      setError(response.status === 429 ? t.waitingListTooMany : response.status === 400 ? t.waitingListInvalid : t.waitingListError);
    } catch {
      setState("idle");
      setError(t.waitingListError);
    }
  }

  if (state === "done") {
    return (
      <p role="status" className={`atelier-wl-done ${className}`}>
        {t.waitingListDone}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className={`atelier-wl-open ${className}`} onClick={() => setOpen(true)}>
        {t.joinWaitingList}
      </button>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={`atelier-wl-form ${className}`}>
      <p className="atelier-wl-intro">{t.waitingListIntro}</p>
      <label htmlFor={`${id}-email`} className="atelier-wl-label">
        {t.waitingListEmailLabel}
      </label>
      <div className="atelier-wl-row">
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="atelier-wl-input"
        />
        <button type="submit" disabled={state === "sending"} className="atelier-wl-submit">
          {state === "sending" ? t.waitingListSending : t.waitingListSubmit}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="atelier-wl-error">
          {error}
        </p>
      ) : null}
    </form>
  );
}
