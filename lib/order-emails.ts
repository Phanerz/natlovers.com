import {inArray} from "drizzle-orm";
import {logFailure} from "@/lib/safe-log";
import {db, products} from "@/lib/db";
import type {Lang} from "@/lib/atelier-copy";
import {combinedLeadTime, isReadyToShip, type FulfilmentStage} from "@/lib/atelier-limits";
import type {CartConfig} from "@/lib/cart";
import {COLOUR_LIBRARY} from "@/lib/colour-library";
import {emailSenderAddress, sendEmail, siteUrl} from "@/lib/email";
import {emailImageUrl} from "@/lib/email-images";
import type {EmailOption, RenderedEmail} from "@/lib/email-layout";
import {
  buildCancelled,
  buildExpired,
  buildOrderPlaced,
  buildOwnerNotice,
  buildPaymentReceived,
  buildStage,
  languageFor as templateLanguageFor,
  type TemplateContext,
  type TemplateItem,
  type TemplateOrder
} from "@/lib/email-templates";
import {formatCurrency} from "@/lib/format";
import {getContactSettings} from "@/lib/site-content";

// One order line as the order saved it. The photo, description and colour hex are snapshots taken at
// checkout; older lines have none of them and fall back to the live product.
export type EmailOrderItem = {
  slug: string;
  name: string;
  quantity: number;
  priceIdr: number;
  priceUsdCents: number | null;
  config: CartConfig | null;
  imageUrl?: string | null;
  shortDescription?: string | null;
  baseColourHex?: string | null;
  handleColourHex?: string | null;
  fulfilmentType?: string | null;
};

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
  items: EmailOrderItem[];
};

export function languageFor(currency: "IDR" | "USD"): Lang {
  return templateLanguageFor(currency);
}

export function orderAmount(order: Pick<EmailOrder, "currency" | "totalIdr" | "totalUsdCents">): string {
  return order.currency === "USD" ? formatCurrency((order.totalUsdCents ?? 0) / 100, "USD") : formatCurrency(order.totalIdr, "IDR");
}

function formatDay(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {day: "numeric", month: "long", timeZone: "Asia/Jakarta"}).format(date);
}

type LeadRow = {min: number | null; max: number | null; fulfilmentType: string | null};

// The longest lead time across the made-to-order pieces, as a date range counted from `from`. Null
// when none has a lead time set: nothing is invented.
function rangeFromRows(rows: LeadRow[], from: Date, lang: Lang): string | null {
  const longest = combinedLeadTime(rows);
  if (!longest) return null;
  const week = 7 * 24 * 60 * 60 * 1000;
  const start = new Date(from.getTime() + longest.min * week);
  const end = new Date(from.getTime() + longest.max * week);
  return longest.min === longest.max ? formatDay(end, lang) : `${formatDay(start, lang)} - ${formatDay(end, lang)}`;
}

export async function estimatedReadyRange(slugs: string[], from: Date, lang: Lang): Promise<string | null> {
  if (!slugs.length) return null;
  try {
    const rows = await db
      .select({min: products.leadTimeWeeksMin, max: products.leadTimeWeeksMax, fulfilmentType: products.fulfilmentType})
      .from(products)
      .where(inArray(products.slug, slugs));
    return rangeFromRows(rows, from, lang);
  } catch (error) {
    logFailure("Lead time lookup failed", error);
    return null;
  }
}

function libraryHex(label: string | null | undefined): string | null {
  if (!label) return null;
  const match = COLOUR_LIBRARY.find((colour) => colour.label.toLowerCase() === label.trim().toLowerCase());
  return match?.hex || null;
}

function lineOptions(item: EmailOrderItem): EmailOption[] {
  const config = item.config;
  if (!config) return [];
  const lines = [...(config.custom?.lines ?? []), ...(config.addonLines ?? [])];
  return lines
    .filter((line) => line.value?.trim())
    .map((line) => ({label: line.label, value: line.value, hex: line.hex ?? null}));
}

type LiveProduct = {slug: string; images: string[]; shortDescription: string | null; dispatchNote: string | null; min: number | null; max: number | null; fulfilmentType: string};

async function loadLiveProducts(slugs: string[]): Promise<Map<string, LiveProduct>> {
  const bySlug = new Map<string, LiveProduct>();
  if (!slugs.length) return bySlug;
  try {
    const rows = await db
      .select({
        slug: products.slug,
        images: products.images,
        shortDescription: products.shortDescription,
        dispatchNote: products.dispatchNote,
        min: products.leadTimeWeeksMin,
        max: products.leadTimeWeeksMax,
        fulfilmentType: products.fulfilmentType
      })
      .from(products)
      .where(inArray(products.slug, slugs));
    for (const row of rows) bySlug.set(row.slug, row);
  } catch (error) {
    logFailure("Product lookup for an email failed", error);
  }
  return bySlug;
}

// Turns the saved order into plain template data: the snapshot first, the live product only to fill
// what an older order never saved. Also reads the contact details the footer shows.
export async function loadTemplateInputs(order: EmailOrder): Promise<{order: TemplateOrder; ctx: TemplateContext}> {
  const lang = languageFor(order.currency);
  const slugs = [...new Set(order.items.map((item) => item.slug))];
  const [live, contact] = await Promise.all([loadLiveProducts(slugs), getContactSettings()]);
  const base = siteUrl();

  const items: TemplateItem[] = order.items.map((item) => {
    const product = live.get(item.slug);
    const config = item.config;
    const ready = isReadyToShip(item.fulfilmentType);
    const baseColour = config?.baseColour?.trim() || null;
    const handleColour = config?.handleColour?.trim() || null;
    return {
      name: item.name,
      quantity: item.quantity,
      description: item.shortDescription?.trim() || product?.shortDescription?.trim() || null,
      imageUrl: emailImageUrl(item.imageUrl ?? product?.images?.[0] ?? null, base, 240),
      baseColour,
      baseColourHex: item.baseColourHex ?? libraryHex(baseColour),
      handleColour,
      handleColourHex: item.handleColourHex ?? libraryHex(handleColour),
      options: lineOptions(item),
      note: config?.personalisationNote?.trim() || null,
      price: order.currency === "USD" ? formatCurrency(((item.priceUsdCents ?? 0) * item.quantity) / 100, "USD") : formatCurrency(item.priceIdr * item.quantity, "IDR"),
      ready,
      dispatchNote: ready ? (product?.dispatchNote?.trim() || null) : null
    };
  });

  // Lead times follow the snapshot of what each line was when it was ordered.
  const rows: LeadRow[] = order.items.map((item) => {
    const product = live.get(item.slug);
    return {min: product?.min ?? null, max: product?.max ?? null, fulfilmentType: item.fulfilmentType ?? null};
  });

  return {
    order: {
      orderRef: order.orderRef,
      currency: order.currency,
      amount: orderAmount(order),
      bankName: order.bankName,
      accountName: order.accountName,
      accountNumber: order.accountNumber,
      expiresAt: order.expiresAt,
      trackingCourier: order.trackingCourier ?? null,
      trackingNumber: order.trackingNumber ?? null,
      customerName: order.customerName ?? null,
      customerEmail: order.customerEmail,
      items
    },
    ctx: {baseUrl: base, contact, senderAddress: emailSenderAddress(), readyRange: rangeFromRows(rows, new Date(), lang)}
  };
}

async function deliver(to: string | string[], rendered: RenderedEmail): Promise<void> {
  await sendEmail({to, subject: rendered.subject, html: rendered.html, text: rendered.text});
}

export async function sendOrderPlacedEmail(order: EmailOrder): Promise<void> {
  if (!order.customerEmail) return;
  const {order: data, ctx} = await loadTemplateInputs(order);
  await deliver(order.customerEmail, buildOrderPlaced(data, ctx));
}

export async function sendPaymentReceivedEmail(order: EmailOrder): Promise<void> {
  if (!order.customerEmail) return;
  const {order: data, ctx} = await loadTemplateInputs(order);
  await deliver(order.customerEmail, buildPaymentReceived(data, ctx));
}

export async function sendStageEmail(order: EmailOrder, stage: FulfilmentStage): Promise<void> {
  if (!order.customerEmail) return;
  const {order: data, ctx} = await loadTemplateInputs(order);
  await deliver(order.customerEmail, buildStage(data, ctx, stage));
}

export async function sendOrderCancelledEmail(order: EmailOrder): Promise<void> {
  if (!order.customerEmail) return;
  const {order: data, ctx} = await loadTemplateInputs(order);
  await deliver(order.customerEmail, buildCancelled(data, ctx));
}

export async function sendOrderExpiredEmail(order: EmailOrder): Promise<void> {
  if (!order.customerEmail) return;
  const {order: data, ctx} = await loadTemplateInputs(order);
  await deliver(order.customerEmail, buildExpired(data, ctx));
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
  const {order: data, ctx} = await loadTemplateInputs(order);
  await deliver(to, buildOwnerNotice(kind, data, ctx));
}
