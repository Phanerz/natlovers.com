import {inArray} from "drizzle-orm";
import {logFailure} from "@/lib/safe-log";
import {db, products} from "@/lib/db";
import {emailCopy, stageLabels, type Lang} from "@/lib/atelier-copy";
import {combinedLeadTime, type FulfilmentStage} from "@/lib/atelier-limits";
import {renderEmail, sendEmail, siteUrl} from "@/lib/email";
import {formatCurrency} from "@/lib/format";

export type EmailOrder = {
  orderRef: string;
  currency: "IDR" | "USD";
  totalIdr: number;
  totalUsdCents: number | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  expiresAt: Date | null;
  trackingCourier?: string | null;
  trackingNumber?: string | null;
  customerEmail: string | null;
  customerName?: string | null;
  itemSlugs: string[];
  itemCount: number;
};

export function languageFor(currency: "IDR" | "USD"): Lang {
  return currency === "IDR" ? "id" : "en";
}

export function orderAmount(order: Pick<EmailOrder, "currency" | "totalIdr" | "totalUsdCents">): string {
  return order.currency === "USD" ? formatCurrency((order.totalUsdCents ?? 0) / 100, "USD") : formatCurrency(order.totalIdr, "IDR");
}

export function orderUrl(orderRef: string): string {
  return `${siteUrl()}/account/orders/${encodeURIComponent(orderRef)}`;
}

function formatWhen(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(date);
}

function formatDay(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {day: "numeric", month: "long", timeZone: "Asia/Jakarta"}).format(date);
}

// The longest lead time across the products in an order, as a date range counted from `from`. Null
// when none of the products has a lead time set: nothing is invented.
export async function estimatedReadyRange(slugs: string[], from: Date, lang: Lang): Promise<string | null> {
  if (!slugs.length) return null;
  try {
    const rows = await db
      .select({min: products.leadTimeWeeksMin, max: products.leadTimeWeeksMax, fulfilmentType: products.fulfilmentType})
      .from(products)
      .where(inArray(products.slug, slugs));
    // Ready-to-ship items have no lead time, so only made-to-order items set the date.
    const longest = combinedLeadTime(rows);
    if (!longest) return null;
    const {min, max} = longest;
    const week = 7 * 24 * 60 * 60 * 1000;
    const start = new Date(from.getTime() + min * week);
    const end = new Date(from.getTime() + max * week);
    return min === max ? formatDay(end, lang) : `${formatDay(start, lang)} - ${formatDay(end, lang)}`;
  } catch (error) {
    logFailure("Lead time lookup failed", error);
    return null;
  }
}

export async function sendOrderPlacedEmail(order: EmailOrder): Promise<void> {
  if (!order.customerEmail) return;
  const lang = languageFor(order.currency);
  const t = emailCopy[lang];
  const amount = orderAmount(order);
  const ready = await estimatedReadyRange(order.itemSlugs, new Date(), lang);

  if (order.currency === "IDR") {
    const expiry = order.expiresAt ? formatWhen(order.expiresAt, lang) : "";
    const html = renderEmail({
      heading: t.placedHeading,
      paragraphs: [expiry ? t.placedIntroIdr(expiry) : "", t.placedReference, t.placedNextIdr, ready ? t.estimatedReady(ready) : ""],
      rows: [
        {label: t.orderRef, value: order.orderRef},
        {label: t.amount, value: amount},
        {label: t.bank, value: order.bankName},
        {label: t.accountName, value: order.accountName},
        {label: t.accountNumber, value: order.accountNumber},
        ...(expiry ? [{label: t.holdUntil, value: expiry}] : [])
      ],
      button: {label: t.viewOrder, url: orderUrl(order.orderRef)},
      footer: t.footer
    });
    await sendEmail({to: order.customerEmail, subject: t.placedSubjectIdr(order.orderRef), html});
    return;
  }

  const html = renderEmail({
    heading: t.placedHeading,
    paragraphs: [t.placedIntroUsd(amount), t.placedNextUsd, ready ? t.estimatedReady(ready) : ""],
    rows: [
      {label: t.orderRef, value: order.orderRef},
      {label: t.amount, value: amount}
    ],
    button: {label: t.viewOrder, url: orderUrl(order.orderRef)},
    footer: t.footer
  });
  await sendEmail({to: order.customerEmail, subject: t.placedSubjectUsd(order.orderRef), html});
}

export async function sendPaymentReceivedEmail(order: EmailOrder): Promise<void> {
  if (!order.customerEmail) return;
  const lang = languageFor(order.currency);
  const t = emailCopy[lang];
  const ready = await estimatedReadyRange(order.itemSlugs, new Date(), lang);
  const html = renderEmail({
    heading: t.paidHeading,
    paragraphs: [t.paidBody(orderAmount(order)), ready ? t.estimatedReady(ready) : ""],
    rows: [{label: t.orderRef, value: order.orderRef}],
    button: {label: t.viewOrder, url: orderUrl(order.orderRef)},
    footer: t.footer
  });
  await sendEmail({to: order.customerEmail, subject: t.paidSubject(order.orderRef), html});
}

export async function sendStageEmail(order: EmailOrder, stage: FulfilmentStage): Promise<void> {
  if (!order.customerEmail) return;
  const lang = languageFor(order.currency);
  const t = emailCopy[lang];
  const label = stageLabels[lang][stage];

  if (stage === "shipped") {
    const html = renderEmail({
      heading: t.shippedHeading,
      paragraphs: [t.shippedBody],
      rows: [
        {label: t.orderRef, value: order.orderRef},
        ...(order.trackingCourier ? [{label: t.courier, value: order.trackingCourier}] : []),
        ...(order.trackingNumber ? [{label: t.trackingNumber, value: order.trackingNumber}] : [])
      ],
      button: {label: t.viewOrder, url: orderUrl(order.orderRef)},
      footer: t.footer
    });
    await sendEmail({to: order.customerEmail, subject: t.shippedSubject(order.orderRef), html});
    return;
  }

  const html = renderEmail({
    heading: label,
    paragraphs: [t.stageBody[stage]],
    rows: [{label: t.orderRef, value: order.orderRef}],
    button: {label: t.viewOrder, url: orderUrl(order.orderRef)},
    footer: t.footer
  });
  await sendEmail({to: order.customerEmail, subject: t.stageSubject(order.orderRef, label), html});
}

// The shop owner's own notices are plain English whatever the customer's language.
export function ownerRecipients(): string[] {
  const explicit = (process.env.OWNER_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
  if (explicit.length) return explicit;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

export async function sendOwnerNotice(kind: "placed" | "paid", order: EmailOrder): Promise<void> {
  const to = ownerRecipients();
  if (!to.length) {
    console.error("Owner notice not sent: set OWNER_NOTIFICATION_EMAIL or ADMIN_EMAILS");
    return;
  }
  const t = emailCopy.en;
  const html = renderEmail({
    heading: kind === "placed" ? t.ownerPlacedSubject(order.orderRef) : t.ownerPaidSubject(order.orderRef),
    paragraphs: [],
    rows: [
      {label: t.orderRef, value: order.orderRef},
      {label: t.ownerCustomer, value: order.customerName ? `${order.customerName} (${order.customerEmail ?? "no email"})` : (order.customerEmail ?? "No email")},
      {label: t.ownerTotal, value: orderAmount(order)},
      {label: t.ownerItems, value: String(order.itemCount)}
    ],
    footer: t.footer
  });
  await sendEmail({to, subject: kind === "placed" ? t.ownerPlacedSubject(order.orderRef) : t.ownerPaidSubject(order.orderRef), html});
}
