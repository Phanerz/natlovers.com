"use client";

import "@/components/atelier/atelier.css";
import {LimitNoticeBox} from "@/components/atelier/limit-notice";
import {WaitingListForm} from "@/components/atelier/waiting-list-form";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";
import {copy, langForCurrency} from "@/lib/atelier-copy";
import {leadTimeRange, monthName} from "@/lib/atelier-limits";

type NotesProduct = {slug: string; capGroup: "PIECES" | "ATELIER_EXTRAS"; leadTimeWeeksMin: number | null; leadTimeWeeksMax: number | null};

// True when this piece cannot be added because the atelier is full for the month.
export function useMonthFull(product: {capGroup: "PIECES" | "ATELIER_EXTRAS"}): boolean {
  const {availability} = useStorefront();
  return Boolean(availability?.piecesMonthFull && product.capGroup === "PIECES");
}

// The quiet atelier lines on a product page: lead time (only when the product has one set), the
// small-numbers line, and, when the month is full, the next month and the waiting list. Nothing
// here shows a count or a countdown.
export function ProductAtelierNotes({product}: {product: NotesProduct}) {
  const {currency} = useSitePreferences();
  const {availability, limitHit, dismissLimitHit} = useStorefront();
  const lang = langForCurrency(currency);
  const t = copy[lang];
  const lead = leadTimeRange(product.leadTimeWeeksMin, product.leadTimeWeeksMax);
  const monthFull = Boolean(availability?.piecesMonthFull && product.capGroup === "PIECES");

  return (
    <div className="mt-4 space-y-2">
      {monthFull && availability ? (
        <div className="atelier-notice" style={{paddingRight: "1rem"}}>
          <p>{t.monthFull(monthName(availability.nextMonth, lang))}</p>
          <WaitingListForm lang={lang} className="mt-3" />
        </div>
      ) : (
        <>
          {lead ? <p className="atelier-small">{t.readyIn(lead.min, lead.max)}</p> : null}
          {limitHit && limitHit.violation.code !== "month_full" ? (
            <LimitNoticeBox hit={limitHit} lang={lang} contactUrl={availability?.wholesaleContactUrl ?? null} onDismiss={dismissLimitHit} />
          ) : null}
        </>
      )}
      <p className="atelier-small">{t.madeInSmallNumbers}</p>
    </div>
  );
}
