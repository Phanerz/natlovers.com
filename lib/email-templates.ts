// Every email the shop sends, built from plain data. No database and no mail client in here, so the
// real senders (lib/order-emails.ts), the preview script and the tests all use the same code.
// All words come from lib/email-copy.ts.

import {emailStageLabels, emailStrings, type EmailLang, type EmailStage} from "@/lib/email-copy";
import {renderEmail, type EmailBlock, type EmailContact, type EmailDocument, type EmailItemCard, type EmailOption, type RenderedEmail} from "@/lib/email-layout";

export type TemplateItem = {
  name: string;
  quantity: number;
  description: string | null;
  // Already an absolute URL that serves a JPEG or PNG, or null for no photo.
  imageUrl: string | null;
  baseColour: string | null;
  baseColourHex: string | null;
  handleColour: string | null;
  handleColourHex: string | null;
  // The other things the customer chose, already readable (custom options, felted animals).
  options: EmailOption[];
  note: string | null;
  // The line total in the order's own currency, already formatted.
  price: string;
  ready: boolean;
  dispatchNote: string | null;
};

export type TemplateOrder = {
  orderRef: string;
  currency: "IDR" | "USD";
  amount: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  expiresAt: Date | null;
  trackingCourier: string | null;
  trackingNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  items: TemplateItem[];
};

export type TemplateContext = {
  baseUrl: string;
  contact: EmailContact;
  senderAddress: string | null;
  // The made-to-order date range, already formatted. Null when no item has a lead time.
  readyRange: string | null;
};

export function languageFor(currency: "IDR" | "USD"): EmailLang {
  return currency === "IDR" ? "id" : "en";
}

export function formatWhen(date: Date, lang: EmailLang): string {
  return new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta"}).format(date);
}

function orderUrl(baseUrl: string, orderRef: string): string {
  return `${baseUrl.replace(/\/$/, "")}/account/orders/${encodeURIComponent(orderRef)}`;
}

function toCard(item: TemplateItem, lang: EmailLang): EmailItemCard {
  const t = emailStrings[lang];
  const options: EmailOption[] = [];
  if (item.baseColour) options.push({label: t.baseColour, value: item.baseColour, hex: item.baseColourHex});
  if (item.handleColour) options.push({label: t.handleColour, value: item.handleColour, hex: item.handleColourHex});
  options.push(...item.options);
  return {
    name: item.name,
    quantityLabel: t.quantity(item.quantity),
    description: item.description,
    imageUrl: item.imageUrl,
    options,
    note: item.note,
    price: item.price
  };
}

function itemsBlock(order: TemplateOrder, lang: EmailLang): EmailBlock | null {
  if (!order.items.length) return null;
  const t = emailStrings[lang];
  const cards = order.items.map((item) => toCard(item, lang));
  // The standard-piece line only makes sense when something is listed beside a photo.
  const hasChoices = cards.some((card) => card.options.length > 0);
  return {type: "items", heading: t.itemsHeading, items: cards, photoNote: hasChoices ? t.photoNote : undefined};
}

// The delivery promise, from the same rules the shop uses: made-to-order pieces give a date range,
// ready-to-ship pieces give a dispatch note and no lead time. Nothing is invented when neither applies.
function promiseBlock(order: TemplateOrder, ctx: TemplateContext, lang: EmailLang): EmailBlock | null {
  const t = emailStrings[lang];
  const made = order.items.filter((item) => !item.ready);
  const ready = order.items.filter((item) => item.ready);
  const lines: string[] = [];
  if (ctx.readyRange && made.length) lines.push(t.estimatedReady(ctx.readyRange));
  if (made.length && order.items.length > 1) lines.push(t.shipsTogether);
  if (ready.length) {
    lines.push(made.length ? t.readyMixed(ready.map((item) => item.name).join(", ")) : t.readyDispatch);
    const notes = [...new Set(ready.map((item) => item.dispatchNote?.trim()).filter((note): note is string => Boolean(note)))];
    lines.push(...notes);
  }
  return lines.length ? {type: "promise", heading: t.deliveryHeading, lines} : null;
}

function compact(blocks: (EmailBlock | null)[]): EmailBlock[] {
  return blocks.filter((block): block is EmailBlock => block !== null);
}

function greeting(order: TemplateOrder, lang: EmailLang): EmailBlock | null {
  const name = order.customerName?.trim();
  return name ? {type: "greeting", text: emailStrings[lang].greeting(name)} : null;
}

function document(order: TemplateOrder, ctx: TemplateContext, input: {subject: string; preheader: string; title: string; blocks: (EmailBlock | null)[]}): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  const doc: EmailDocument = {
    lang,
    t,
    subject: input.subject,
    preheader: input.preheader,
    label: t.labelOrderNote(order.orderRef),
    title: input.title,
    blocks: compact(input.blocks),
    contact: ctx.contact,
    baseUrl: ctx.baseUrl,
    senderAddress: ctx.senderAddress
  };
  return renderEmail(doc);
}

function viewButton(order: TemplateOrder, ctx: TemplateContext, lang: EmailLang): EmailBlock {
  return {type: "button", label: emailStrings[lang].viewOrder, url: orderUrl(ctx.baseUrl, order.orderRef)};
}

// ---------------------------------------------------------------------------
// Customer emails
// ---------------------------------------------------------------------------

export function buildOrderPlaced(order: TemplateOrder, ctx: TemplateContext): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  const expiry = order.expiresAt ? formatWhen(order.expiresAt, lang) : "";
  if (order.currency === "IDR") {
    return document(order, ctx, {
      subject: t.placedSubject(order.orderRef),
      preheader: t.placedPreheaderIdr(order.orderRef),
      title: t.placedHeading,
      blocks: [
        greeting(order, lang),
        {type: "p", text: expiry ? t.placedIntroIdr(expiry) : t.placedReference},
        itemsBlock(order, lang),
        {
          type: "rows",
          heading: t.bankHeading,
          rows: [
            {label: t.orderRef, value: order.orderRef},
            {label: t.amount, value: order.amount},
            {label: t.bank, value: order.bankName},
            {label: t.accountName, value: order.accountName},
            {label: t.accountNumber, value: order.accountNumber, spaced: true}
          ]
        },
        promiseBlock(order, ctx, lang),
        viewButton(order, ctx, lang)
      ]
    });
  }
  return document(order, ctx, {
    subject: t.placedSubject(order.orderRef),
    preheader: t.placedPreheaderUsd(order.orderRef),
    title: t.placedHeading,
    blocks: [
      greeting(order, lang),
      {type: "p", text: t.placedIntroUsd(order.amount)},
      itemsBlock(order, lang),
      {type: "p", text: t.placedNextUsd},
      promiseBlock(order, ctx, lang),
      viewButton(order, ctx, lang)
    ]
  });
}

export function buildPaymentReceived(order: TemplateOrder, ctx: TemplateContext): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  return document(order, ctx, {
    subject: t.paidSubject(order.orderRef),
    preheader: t.paidPreheader(order.orderRef),
    title: t.paidHeading,
    blocks: [
      greeting(order, lang),
      {type: "p", text: t.paidBody(order.amount)},
      itemsBlock(order, lang),
      promiseBlock(order, ctx, lang),
      viewButton(order, ctx, lang)
    ]
  });
}

export function buildStage(order: TemplateOrder, ctx: TemplateContext, stage: EmailStage): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  if (stage === "shipped") return buildShipped(order, ctx);
  const label = emailStageLabels[lang][stage];
  return document(order, ctx, {
    subject: t.stageSubject(order.orderRef, label),
    preheader: t.stagePreheader(order.orderRef, label),
    title: label,
    blocks: [
      greeting(order, lang),
      {type: "p", text: t.stageBody[stage]},
      viewButton(order, ctx, lang)
    ]
  });
}

export function buildShipped(order: TemplateOrder, ctx: TemplateContext): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  return document(order, ctx, {
    subject: t.shippedSubject(order.orderRef),
    preheader: t.shippedPreheader(order.orderRef),
    title: t.shippedHeading,
    blocks: [
      greeting(order, lang),
      {type: "p", text: t.shippedBody},
      {
        type: "rows",
        rows: [
          {label: t.orderRef, value: order.orderRef},
          ...(order.trackingCourier ? [{label: t.courier, value: order.trackingCourier}] : []),
          ...(order.trackingNumber ? [{label: t.trackingNumber, value: order.trackingNumber, spaced: true}] : [])
        ]
      },
      viewButton(order, ctx, lang)
    ]
  });
}

export function buildCancelled(order: TemplateOrder, ctx: TemplateContext): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  return document(order, ctx, {
    subject: t.cancelledSubject(order.orderRef),
    preheader: t.cancelledPreheader(order.orderRef),
    title: t.cancelledHeading,
    blocks: [
      greeting(order, lang),
      {type: "p", text: t.cancelledBody},
      {type: "p", text: t.cancelledHelp},
      {type: "button", label: t.browse, url: `${ctx.baseUrl.replace(/\/$/, "")}/catalogue`}
    ]
  });
}

export function buildExpired(order: TemplateOrder, ctx: TemplateContext): RenderedEmail {
  const lang = languageFor(order.currency);
  const t = emailStrings[lang];
  return document(order, ctx, {
    subject: t.expiredSubject(order.orderRef),
    preheader: t.expiredPreheader(order.orderRef),
    title: t.expiredHeading,
    blocks: [
      greeting(order, lang),
      {type: "p", text: t.expiredBody},
      {type: "p", text: t.expiredHelp},
      {type: "button", label: t.browse, url: `${ctx.baseUrl.replace(/\/$/, "")}/catalogue`}
    ]
  });
}

// ---------------------------------------------------------------------------
// Owner emails: workshop summaries, always English. The photo, options and note come first.
// ---------------------------------------------------------------------------

export function buildOwnerNotice(kind: "placed" | "paid", order: TemplateOrder, ctx: TemplateContext): RenderedEmail {
  const t = emailStrings.en;
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const customer = order.customerName ? `${order.customerName} (${order.customerEmail ?? t.ownerNoEmail})` : (order.customerEmail ?? t.ownerNoEmail);
  const doc: EmailDocument = {
    lang: "en",
    t,
    subject: kind === "placed" ? t.ownerPlacedSubject(order.orderRef) : t.ownerPaidSubject(order.orderRef),
    preheader: kind === "placed" ? t.ownerPlacedPreheader(order.orderRef, count) : t.ownerPaidPreheader(order.orderRef),
    label: t.ownerLabel(order.orderRef),
    title: kind === "placed" ? t.ownerPlacedHeading : t.ownerPaidHeading,
    blocks: compact([
      itemsBlock(order, "en"),
      {
        type: "rows",
        rows: [
          {label: t.orderRef, value: order.orderRef},
          {label: t.ownerCustomer, value: customer},
          {label: t.ownerTotal, value: order.amount},
          {label: t.ownerItems, value: String(count)},
          {label: t.ownerStatus, value: kind === "paid" ? t.ownerStatusPaid : t.ownerStatusAwaiting}
        ]
      },
      {type: "button", label: t.ownerOpenAdmin, url: `${ctx.baseUrl.replace(/\/$/, "")}/mimin/orders`}
    ]),
    contact: ctx.contact,
    baseUrl: ctx.baseUrl,
    senderAddress: ctx.senderAddress,
    compactFooter: true
  };
  return renderEmail(doc);
}

// ---------------------------------------------------------------------------
// Sign-in and waiting list
// ---------------------------------------------------------------------------

export function buildSignIn(url: string, ctx: Omit<TemplateContext, "readyRange">): RenderedEmail {
  const t = emailStrings.en;
  return renderEmail({
    lang: "en",
    t,
    subject: t.signInSubject,
    preheader: t.signInPreheader,
    label: t.labelSignIn,
    title: t.signInHeading,
    blocks: [{type: "p", text: t.signInBody}, {type: "button", label: t.signInButton, url}, {type: "small", text: t.signInIgnore}],
    contact: ctx.contact,
    baseUrl: ctx.baseUrl,
    senderAddress: ctx.senderAddress
  });
}

export function buildWaitingJoined(lang: EmailLang, unsubscribeUrl: string, ctx: Omit<TemplateContext, "readyRange">): RenderedEmail {
  const t = emailStrings[lang];
  return renderEmail({
    lang,
    t,
    subject: t.waitingSubject,
    preheader: t.waitingPreheader,
    label: t.labelWaitingList,
    title: t.waitingHeading,
    blocks: [{type: "p", text: t.waitingBody}, {type: "small", text: "", link: {label: t.unsubscribe, url: unsubscribeUrl}}],
    contact: ctx.contact,
    baseUrl: ctx.baseUrl,
    senderAddress: ctx.senderAddress
  });
}

export function buildReopened(lang: EmailLang, month: string, unsubscribeUrl: string, ctx: Omit<TemplateContext, "readyRange">): RenderedEmail {
  const t = emailStrings[lang];
  return renderEmail({
    lang,
    t,
    subject: t.reopenedSubject,
    preheader: t.reopenedPreheader,
    label: t.labelWaitingList,
    title: t.reopenedHeading,
    blocks: [
      {type: "p", text: t.reopenedBody(month)},
      {type: "button", label: t.browse, url: `${ctx.baseUrl.replace(/\/$/, "")}/catalogue`},
      {type: "small", text: "", link: {label: t.unsubscribe, url: unsubscribeUrl}}
    ],
    contact: ctx.contact,
    baseUrl: ctx.baseUrl,
    senderAddress: ctx.senderAddress
  });
}
