// The branded emails: escaping, absolute URLs, alt text, plain-text part, copy rules, subjects.
// Pure tests, no database.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {emailStrings, emailStageLabels} from "../lib/email-copy";
import {emailImageUrl, isAllowedImageHost} from "../lib/email-images";
import {escapeHtml, senderAddressOf} from "../lib/email-layout";
import {
  buildCancelled,
  buildExpired,
  buildOrderPlaced,
  buildOwnerNotice,
  buildPaymentReceived,
  buildReopened,
  buildShipped,
  buildSignIn,
  buildStage,
  buildWaitingJoined,
  type TemplateContext,
  type TemplateOrder
} from "../lib/email-templates";

const EM_DASH = "—";
const BASE = "https://natlovers.com";
const ctx: TemplateContext = {
  baseUrl: BASE,
  contact: {address: "Jl. Contoh 1, Yogyakarta", email: "hello@natlovers.com", whatsapp: [{name: "Anita", number: "+62 812-2697-007"}], instagram: "natlovers1998"},
  senderAddress: "orders@natlovers.com",
  readyRange: "16 December - 30 December"
};

function order(currency: "IDR" | "USD", overrides: Partial<TemplateOrder> = {}, itemOverrides: Partial<TemplateOrder["items"][number]> = {}): TemplateOrder {
  return {
    orderRef: "NAT-48210369",
    currency,
    amount: currency === "IDR" ? "Rp 1,250,000" : "$92",
    bankName: "Bank Central Asia",
    accountName: "Natlovers",
    accountNumber: "0123456789",
    expiresAt: new Date("2026-11-18T10:30:00+07:00"),
    trackingCourier: "JNE",
    trackingNumber: "CGK1",
    customerName: "Anita",
    customerEmail: "a@example.com",
    items: [
      {
        name: "Water Hyacinth Tote",
        quantity: 1,
        description: "Woven by hand.",
        imageUrl: `${BASE}/images/natlovers-bags-1.jpg`,
        baseColour: "Natural Lovers",
        baseColourHex: "#B89A72",
        handleColour: "Cognac",
        handleColourHex: "#A66A3F",
        options: [{label: "Size", value: "Medium"}],
        note: "A small letter A inside.",
        price: "$92",
        ready: false,
        dispatchNote: null,
        ...itemOverrides
      }
    ],
    ...overrides
  };
}

function everyEmail(o: TemplateOrder) {
  return [
    buildOrderPlaced(o, ctx),
    buildPaymentReceived(o, ctx),
    buildStage(o, ctx, "received"),
    buildStage(o, ctx, "in_atelier"),
    buildStage(o, ctx, "finishing"),
    buildShipped(o, ctx),
    buildCancelled(o, ctx),
    buildExpired(o, ctx),
    buildOwnerNotice("placed", o, ctx),
    buildOwnerNotice("paid", o, ctx)
  ];
}

const allEmails = [...everyEmail(order("USD")), ...everyEmail(order("IDR"))];
const accountEmails = [
  buildSignIn(`${BASE}/login`, ctx),
  buildWaitingJoined("en", `${BASE}/u?t=1`, ctx),
  buildWaitingJoined("id", `${BASE}/u?t=1`, ctx),
  buildReopened("en", "December", `${BASE}/u?t=1`, ctx),
  buildReopened("id", "Desember", `${BASE}/u?t=1`, ctx)
];

test("every customer-supplied value is escaped in the HTML", () => {
  const hostile = `<script>alert(1)</script> "quoted" & <img src=x onerror=1>`;
  const o = order("USD", {customerName: hostile, accountName: hostile, trackingCourier: hostile}, {note: hostile, name: hostile, description: hostile, options: [{label: hostile, value: hostile, hex: '#fff"onload="x'}]});
  for (const email of everyEmail(o)) {
    assert.ok(!email.html.includes("<script>"), "raw script tag found");
    assert.ok(!email.html.includes("<img src=x"), "raw injected image found");
    assert.ok(!email.html.includes('onload="x'), "hex was not validated");
  }
  assert.equal(escapeHtml(`<a href="x">&'</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
});

test("the plain-text part keeps the note and name as written, with no HTML in it", () => {
  const o = order("USD", {customerName: "Anita & Co"}, {note: "Line one\nLine two <3"});
  const placed = buildOrderPlaced(o, ctx);
  assert.ok(placed.text.includes("Line one\nLine two <3"));
  assert.ok(placed.text.includes("Anita & Co"));
  assert.ok(!placed.text.includes("&amp;"));
  assert.ok(!/<(table|td|div|img|a )/.test(placed.text));
});

test("every image and link is absolute, and every image has alt text", () => {
  for (const email of [...allEmails, ...accountEmails]) {
    const imgs = email.html.match(/<img\b[^>]*>/g) ?? [];
    assert.ok(imgs.length >= 3, "expected the tape, logo and signature images");
    for (const tag of imgs) {
      assert.match(tag, /\balt="/, `missing alt: ${tag}`);
      const src = /\bsrc="([^"]*)"/.exec(tag)?.[1] ?? "";
      assert.match(src, /^https?:\/\//, `relative image address: ${src}`);
      assert.ok(!src.startsWith("data:"));
      assert.ok(!/\.(svg|webp|avif)(\?|$)/i.test(src), `image is not JPEG or PNG: ${src}`);
    }
    for (const match of email.html.matchAll(/\bhref="([^"]*)"/g)) {
      assert.match(match[1], /^(https?:\/\/|mailto:)/, `relative link: ${match[1]}`);
    }
    assert.ok(!/url\(['"]?\//.test(email.html), "relative background image");
  }
});

test("the logo and the real product photo are shown, and a missing photo leaves no empty image", () => {
  const withPhoto = buildOrderPlaced(order("USD"), ctx).html;
  assert.ok(withPhoto.includes(`${BASE}/email/logo.png`));
  assert.ok(withPhoto.includes(`${BASE}/images/natlovers-bags-1.jpg`));
  const without = buildOrderPlaced(order("USD", {}, {imageUrl: null}), ctx).html;
  assert.ok(!without.includes("natlovers-bags-1.jpg"));
  assert.ok(!/src=""/.test(without));
});

test("every email has a plain-text part, a preheader and a subject; order emails carry the reference", () => {
  for (const email of [...allEmails, ...accountEmails]) {
    assert.ok(email.text.trim().length > 40, "plain text part is missing");
    assert.match(email.html, /display:none/);
    assert.match(email.html, /<meta name="color-scheme"/);
    assert.ok(email.subject.length > 0 && !/[\r\n]/.test(email.subject));
  }
  for (const email of allEmails) assert.ok(email.subject.includes("NAT-48210369"), `no order reference in: ${email.subject}`);
});

test("no subject is in capitals and none has an exclamation mark", () => {
  for (const email of [...allEmails, ...accountEmails]) {
    assert.notEqual(email.subject, email.subject.toUpperCase(), `all capitals: ${email.subject}`);
    assert.ok(!email.subject.includes("!"));
  }
});

// Calls every copy function with plain sample arguments and collects every string.
function allCopy(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") out.push(value);
    else if (typeof value === "function") out.push(String((value as (...args: unknown[]) => unknown)("NAT-1", "2")));
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(emailStrings);
  walk(emailStageLabels);
  return out;
}

test("the copy has no em dashes, no exclamation marks and no emoji", () => {
  for (const text of allCopy()) {
    assert.ok(!text.includes(EM_DASH), `em dash in: ${text}`);
    assert.ok(!text.includes("–"), `en dash in: ${text}`);
    assert.ok(!text.includes("!"), `exclamation mark in: ${text}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(text), `emoji in: ${text}`);
  }
});

test("the email code and the rendered emails contain no em dashes", () => {
  for (const file of ["lib/email.ts", "lib/email-copy.ts", "lib/email-layout.ts", "lib/email-templates.ts", "lib/email-images.ts", "lib/order-emails.ts"]) {
    assert.ok(!readFileSync(file, "utf8").includes(EM_DASH), `em dash in ${file}`);
  }
  for (const email of [...allEmails, ...accountEmails]) {
    assert.ok(!email.html.includes(EM_DASH) && !email.text.includes(EM_DASH));
  }
});

test("empty contact details leave no line and no placeholder", () => {
  const bare = {...ctx, contact: {email: "", whatsapp: []}, senderAddress: "onboarding@resend.dev"};
  const email = buildOrderPlaced(order("USD"), bare);
  for (const word of ["Address", "WhatsApp", "Email", "Instagram"]) assert.ok(!email.html.includes(`>${word}<`), `${word} line was kept`);
  assert.ok(!/undefined|null|\{\{/.test(email.html + email.text));
  assert.ok(!email.text.includes("onboarding@resend.dev"), "the add-to-contacts line must only name a natlovers.com sender");
  assert.ok(buildOrderPlaced(order("USD"), ctx).text.includes("orders@natlovers.com"));
});

test("rupiah orders are Indonesian and everything else is English; the owner always reads English", () => {
  assert.match(buildOrderPlaced(order("IDR"), ctx).html, /lang="id"/);
  assert.match(buildOrderPlaced(order("USD"), ctx).html, /lang="en"/);
  assert.match(buildOwnerNotice("placed", order("IDR"), ctx).html, /lang="en"/);
  assert.ok(buildOrderPlaced(order("IDR"), ctx).html.includes("Transfer bank"));
  assert.ok(!buildOrderPlaced(order("USD"), ctx).html.includes("Transfer bank"));
});

test("delivery: made to order shows a date range, ready stock shows a dispatch note and no lead time", () => {
  const made = buildPaymentReceived(order("USD"), ctx).text;
  assert.ok(made.includes("Estimated ready: 16 December - 30 December."));
  const ready = buildPaymentReceived(order("USD", {}, {ready: true, dispatchNote: "Packed within two working days."}), {...ctx, readyRange: null}).text;
  assert.ok(!ready.includes("Estimated ready"));
  assert.ok(ready.includes("Packed within two working days."));
});

test("the order card lists the chosen options and the note, with the standard-piece line", () => {
  const email = buildOrderPlaced(order("USD"), ctx);
  for (const text of ["Base colour", "Natural Lovers", "Handle colour", "Cognac", "Size", "Medium", "A small letter A inside."]) assert.ok(email.html.includes(text), text);
  assert.ok(email.html.includes('bgcolor="#B89A72"'));
  assert.ok(email.text.includes("The photo shows the standard piece, your colours are listed beside it."));
});

test("product photos are JPEG or PNG links, and other formats go through the image route", () => {
  assert.equal(emailImageUrl("https://x.public.blob.vercel-storage.com/a.jpg", BASE), "https://x.public.blob.vercel-storage.com/a.jpg");
  assert.equal(emailImageUrl("/images/a.png", BASE), `${BASE}/images/a.png`);
  const webp = emailImageUrl("https://x.public.blob.vercel-storage.com/a.webp", BASE, 240)!;
  assert.ok(webp.startsWith(`${BASE}/api/email-image?src=`) && webp.endsWith("&w=240"));
  assert.ok(emailImageUrl("https://x.public.blob.vercel-storage.com/a.avif", BASE)!.includes("/api/email-image"));
  assert.equal(emailImageUrl("javascript:alert(1)", BASE), null);
  assert.equal(emailImageUrl("", BASE), null);
  assert.equal(emailImageUrl(null, BASE), null);
});

test("the image route only fetches the shop's own hosts", () => {
  assert.ok(isAllowedImageHost("abc.public.blob.vercel-storage.com", "natlovers.com"));
  assert.ok(isAllowedImageHost("natlovers.com", "natlovers.com"));
  assert.ok(!isAllowedImageHost("evil.example.com", "natlovers.com"));
  assert.ok(!isAllowedImageHost("public.blob.vercel-storage.com.evil.com", "natlovers.com"));
  assert.ok(!isAllowedImageHost("169.254.169.254", "natlovers.com"));
});

test("sender and reply-to come from EMAIL_FROM and EMAIL_REPLY_TO, with today's sender as the default", async () => {
  const keep = {EMAIL_FROM: process.env.EMAIL_FROM, RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL, EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO};
  const restore = (name: keyof typeof keep) => {
    if (keep[name] === undefined) delete process.env[name];
    else process.env[name] = keep[name];
  };
  try {
    delete process.env.EMAIL_FROM;
    delete process.env.RESEND_FROM_EMAIL;
    delete process.env.EMAIL_REPLY_TO;
    const email = await import("../lib/email");
    assert.equal(email.emailFrom(), "Natlovers <onboarding@resend.dev>");
    assert.equal(email.emailReplyTo(), undefined);
    process.env.RESEND_FROM_EMAIL = "Natlovers <old@natlovers.com>";
    assert.equal(email.emailFrom(), "Natlovers <old@natlovers.com>");
    process.env.EMAIL_FROM = "Natlovers <orders@natlovers.com>";
    process.env.EMAIL_REPLY_TO = "hello@natlovers.com";
    assert.equal(email.emailFrom(), "Natlovers <orders@natlovers.com>");
    assert.equal(email.emailReplyTo(), "hello@natlovers.com");
    assert.equal(email.emailSenderAddress(), "orders@natlovers.com");
  } finally {
    (Object.keys(keep) as (keyof typeof keep)[]).forEach(restore);
  }
  assert.equal(senderAddressOf("orders@natlovers.com"), "orders@natlovers.com");
});

test("no open or click tracking: no tracking pixel and no link rewriting", () => {
  for (const email of allEmails) {
    for (const tag of email.html.match(/<img\b[^>]*>/g) ?? []) assert.ok(!/width="1"|height="1"/.test(tag), "a one-pixel image looks like a tracker");
  }
  assert.ok(!readFileSync("lib/email.ts", "utf8").includes("tracking: true"));
});
