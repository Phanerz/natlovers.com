"use client";

import Link from "next/link";
import {useEffect, useId, useRef, useState} from "react";
import {createPortal} from "react-dom";
import {Cookie, X} from "lucide-react";
import {useDialog} from "@/components/consent/use-dialog";
import type {ConsentPreferences} from "@/lib/consent";

type Row = {
  key: "necessary" | "analytics" | "marketing";
  title: string;
  text: string;
};

const ROWS: Row[] = [
  {
    key: "necessary",
    title: "Necessary",
    text: "Keeps you signed in, your bag, your theme, language and currency. The shop cannot work without these, so they are always on."
  },
  {
    key: "analytics",
    title: "Analytics",
    text: "Counts one anonymous visit for each new device: the country, and whether it was a phone or a laptop. Never your name, email or IP address."
  },
  {
    key: "marketing",
    title: "Marketing",
    text: "We do not use any marketing or advertising cookies today. If we ever do, they stay off until you turn them on here."
  }
];

// The three kinds of storage, each with a switch. Necessary is on and cannot be turned off; the
// other two start off unless the visitor had already allowed them.
export function PreferencesModal({
  open,
  current,
  onSave,
  onClose
}: {
  open: boolean;
  current: ConsentPreferences | null;
  onSave: (choice: {analytics: boolean; marketing: boolean}) => void;
  onClose: () => void;
}) {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setAnalytics(current?.analytics ?? false);
    setMarketing(current?.marketing ?? false);
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useDialog(open, dialogRef, onClose);

  if (!open || !mounted) return null;

  const values = {necessary: true, analytics, marketing};
  const setters = {analytics: setAnalytics, marketing: setMarketing};

  return createPortal(
    <div className="nlc-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="nlc-dialog">
        <button type="button" className="nlc-close" onClick={onClose} aria-label="Close">
          <X aria-hidden className="h-5 w-5" />
        </button>
        <span className="nlc-icon" aria-hidden>
          <Cookie className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <h2 id={titleId} className="nlc-title font-display">
          Cookie preferences
        </h2>
        <p className="nlc-text">
          Choose what we may store on this device. You can change this any time with &ldquo;Cookie settings&rdquo; in the footer. Read more in our{" "}
          <Link href="/privacy" className="nlc-link" onClick={onClose}>
            Privacy Policy
          </Link>
          .
        </p>

        <ul className="nlc-prefs">
          {ROWS.map((row) => {
            const locked = row.key === "necessary";
            const on = values[row.key];
            return (
              <li key={row.key} className="nlc-pref">
                <div className="nlc-pref__copy">
                  <p className="nlc-pref__title">{row.title}</p>
                  <p className="nlc-pref__text">{row.text}</p>
                </div>
                {locked ? (
                  <span className="nlc-pref__always">Always on</span>
                ) : (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={row.title}
                    className={`nlc-switch ${on ? "is-on" : ""}`}
                    onClick={() => setters[row.key as "analytics" | "marketing"](!on)}
                  >
                    <span className="nlc-switch__knob" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="nlc-actions nlc-actions--stack">
          <button type="button" className="nlc-primary" onClick={() => onSave({analytics, marketing})}>
            Save preferences
          </button>
          <button type="button" className="nlc-secondary" onClick={() => onSave({analytics: true, marketing: true})}>
            Accept all
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
