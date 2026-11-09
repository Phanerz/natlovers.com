"use client";

import {useState} from "react";

// Asks the server for the hosted payment page (a fresh one if the old one expired) and goes there.
// The button never marks anything paid: only the payment provider confirmation does that.
export function PayNowButton({orderRef, label, openingLabel, unavailableLabel}: {orderRef: string; label: string; openingLabel: string; unavailableLabel: string}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function pay() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderRef)}/pay`, {method: "POST"});
      const payload = (await response.json().catch(() => null)) as {url?: string} | null;
      if (response.ok && typeof payload?.url === "string") {
        window.location.assign(payload.url);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <div className="mt-4">
      <button type="button" className="bs-btn bs-btn-primary" onClick={pay} disabled={busy}>
        {busy ? openingLabel : label}
      </button>
      {failed ? (
        <p className="atelier-small mt-2" role="alert">
          {unavailableLabel}
        </p>
      ) : null}
    </div>
  );
}
