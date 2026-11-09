"use client";

import {copy, limitNotice, type Lang} from "@/lib/atelier-copy";
import type {LimitHit} from "@/components/storefront-provider";
import {WaitingListForm} from "@/components/atelier/waiting-list-form";

// A quiet, factual sentence for a limit the customer ran into. When the atelier is full for the
// month it also offers the waiting list; for a quantity limit it links to the enquiry page if the
// owner has set one. No counts, no countdowns.
export function LimitNoticeBox({
  hit,
  lang,
  contactUrl,
  context = "bag",
  onDismiss
}: {
  hit: LimitHit;
  lang: Lang;
  contactUrl: string | null;
  context?: "bag" | "order";
  onDismiss?: () => void;
}) {
  const notice = limitNotice(hit.violation, lang, hit.nextMonth, context);
  return (
    <div role="status" className="atelier-notice">
      <p>
        {notice.text}
        {notice.showContactLink && contactUrl ? (
          <>
            {" "}
            <a href={contactUrl} className="atelier-notice-link">
              {copy[lang].getInTouch}
            </a>
          </>
        ) : null}
      </p>
      {notice.showWaitingList ? <WaitingListForm lang={lang} className="mt-3" /> : null}
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="atelier-notice-dismiss" aria-label={lang === "id" ? "Tutup catatan" : "Dismiss note"}>
          &times;
        </button>
      ) : null}
    </div>
  );
}
