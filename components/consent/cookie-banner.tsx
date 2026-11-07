"use client";

import Link from "next/link";
import {Cookie} from "lucide-react";

// The first thing a new visitor sees: a bar across the foot of the page on a laptop, a sheet on a
// phone. It does not block the page. "Essential only" sits as a plain link so that saying no is
// as easy as saying yes.
export function CookieBanner({
  onManage,
  onAcceptAll,
  onEssentialOnly
}: {
  onManage: () => void;
  onAcceptAll: () => void;
  onEssentialOnly: () => void;
}) {
  return (
    <div className="nlc-banner" role="region" aria-label="Cookie notice">
      <div className="nlc-banner__card">
        <span className="nlc-icon nlc-banner__icon" aria-hidden>
          <Cookie className="h-6 w-6" strokeWidth={1.6} />
        </span>
        <div className="nlc-banner__copy">
          <h2 className="nlc-banner__title font-display">We use cookies</h2>
          <p className="nlc-banner__text">
            Some keep the shop working. With your permission, others count visits so we can see where people come from, never who they are.{" "}
            <Link href="/privacy" className="nlc-link">
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="nlc-banner__actions">
          <button type="button" className="nlc-secondary" onClick={onManage}>
            Manage preferences
          </button>
          <button type="button" className="nlc-primary" onClick={onAcceptAll}>
            Accept all
          </button>
          <button type="button" className="nlc-banner__essential" onClick={onEssentialOnly}>
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
