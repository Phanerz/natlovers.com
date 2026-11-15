// Sends sample emails through Resend, only to addresses listed in ADMIN_EMAILS.
//   npm run email:send-test -- --to someone@example.com
// Every template is sent once with sample data, subjects prefixed with [Test]. Nothing is read from or
// written to the database. Photos and logos link to the live site (NEXT_PUBLIC_SITE_URL), so they only
// appear once this branch is deployed there.
import {
  buildCancelled,
  buildExpired,
  buildOrderPlaced,
  buildOwnerNotice,
  buildPaymentReceived,
  buildReopened,
  buildStage,
  buildShipped,
  buildSignIn,
  buildWaitingJoined,
  type TemplateContext,
  type TemplateOrder
} from "../lib/email-templates";
import type {RenderedEmail} from "../lib/email-layout";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Variables may already be in the environment.
}

async function main() {
  const args = process.argv.slice(2);
  const at = args.indexOf("--to");
  const to = at >= 0 ? (args[at + 1] ?? "").trim() : "";
  if (!to) throw new Error("Usage: npm run email:send-test -- --to <address>");
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.includes(to.toLowerCase())) throw new Error("That address is not in ADMIN_EMAILS, so nothing was sent.");

  const {sendEmail, siteUrl, emailSenderAddress} = await import("../lib/email");
  const base = siteUrl();
  const ctx: TemplateContext = {
    baseUrl: base,
    contact: {
      address: "Jl. Tata Bumi Selatan No.107, Banyuraden, Gamping, Sleman, Yogyakarta",
      email: "hello@natlovers.com",
      whatsapp: [{name: "Anita Yan", number: "+62 812-2697-007"}],
      instagram: "natlovers1998"
    },
    senderAddress: emailSenderAddress(),
    readyRange: "16 December - 30 December"
  };

  const sample = (currency: "IDR" | "USD"): TemplateOrder => ({
    orderRef: "NAT-00000000",
    currency,
    amount: currency === "IDR" ? "Rp 1,250,000" : "$92",
    bankName: "Sample Bank",
    accountName: "Natlovers",
    accountNumber: "0000000000",
    expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
    trackingCourier: "JNE",
    trackingNumber: "TEST0000000",
    customerName: "Sample Customer",
    customerEmail: to,
    items: [
      {
        name: "Water Hyacinth Tote",
        quantity: 1,
        description: "A structured tote woven from water hyacinth, lined and finished by hand.",
        imageUrl: `${base}/images/natlovers-bags-1.jpg`,
        baseColour: "Natural Lovers",
        baseColourHex: "#B89A72",
        handleColour: "Cognac",
        handleColourHex: "#A66A3F",
        options: [{label: "Size", value: "Medium"}],
        note: "Please stitch a small letter A inside the pocket.",
        price: currency === "IDR" ? "Rp 1,250,000" : "$92",
        ready: false,
        dispatchNote: null
      }
    ]
  });

  const batch: RenderedEmail[] = [];
  for (const currency of ["USD", "IDR"] as const) {
    const order = sample(currency);
    batch.push(
      buildOrderPlaced(order, ctx),
      buildPaymentReceived(order, ctx),
      buildStage(order, ctx, "in_atelier"),
      buildStage(order, ctx, "finishing"),
      buildShipped(order, ctx),
      buildCancelled(order, ctx),
      buildExpired(order, ctx)
    );
  }
  batch.push(buildOwnerNotice("placed", sample("IDR"), ctx), buildOwnerNotice("paid", sample("IDR"), ctx));
  batch.push(buildSignIn(`${base}/login`, ctx), buildWaitingJoined("en", `${base}/waiting-list/unsubscribe?token=sample`, ctx), buildReopened("id", "Desember", `${base}/waiting-list/unsubscribe?token=sample`, ctx));

  let sent = 0;
  for (const email of batch) {
    const result = await sendEmail({to, subject: `[Test] ${email.subject}`, html: email.html, text: email.text});
    if (result.ok) sent += 1;
  }
  console.log(`Sent ${sent} of ${batch.length} sample emails.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
