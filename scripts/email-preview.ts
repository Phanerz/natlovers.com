// Renders every email template to email-previews/ as HTML, plain text and Playwright screenshots.
//   npm run email:preview
// Scenarios: one item with a photo, one with a very long note, one with no photo (and no contact
// details, to show the empty lines being skipped). Each in English (dollar order) and Indonesian
// (rupiah order). Screenshots at 600 and 375 wide, plus dark mode at 600. Nothing is sent anywhere.
import {mkdirSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {createServer} from "node:http";
import {readFileSync} from "node:fs";
import {pathToFileURL} from "node:url";
import {chromium} from "playwright";
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
  type TemplateItem,
  type TemplateOrder
} from "../lib/email-templates";
import type {RenderedEmail} from "../lib/email-layout";

const root = process.cwd();
const outDir = path.join(root, "email-previews");
// Images and assets are served from the public folder by a tiny local server, so the previews load
// them over http exactly as a mail client would load them over https.
const PORT = 54330;
const baseUrl = `http://127.0.0.1:${PORT}`;
const types: Record<string, string> = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"};
const server = createServer((request, response) => {
  const file = path.join(root, "public", decodeURIComponent((request.url ?? "/").split("?")[0]));
  try {
    response.writeHead(200, {"Content-Type": types[path.extname(file).toLowerCase()] ?? "application/octet-stream"});
    response.end(readFileSync(file));
  } catch {
    response.writeHead(404);
    response.end();
  }
});

const fullContact = {
  address: "Jl. Tata Bumi Selatan No.107, Banyuraden, Gamping, Sleman, Yogyakarta",
  email: "hello@natlovers.com",
  whatsapp: [
    {name: "Anita Yan", number: "+62 812-2697-007"},
    {name: "Phanuel", number: "+62 811-2500-1888"}
  ],
  instagram: "natlovers1998"
};
const emptyContact = {email: "hello@natlovers.com", whatsapp: [{name: "Anita Yan", number: "+62 812-2697-007"}]};

const photo = `${baseUrl}/images/natlovers-bags-1.jpg`;

function tote(overrides: Partial<TemplateItem> = {}): TemplateItem {
  return {
    name: "Water Hyacinth Tote",
    quantity: 1,
    description: "A structured tote woven from water hyacinth, lined and finished by hand.",
    imageUrl: photo,
    baseColour: "Natural Lovers",
    baseColourHex: "#B89A72",
    handleColour: "Cognac",
    handleColourHex: "#A66A3F",
    options: [
      {label: "Size", value: "Medium"},
      {label: "Felted dog", value: "Labrador, Cognac coat", hex: "#A66A3F"}
    ],
    note: "Please stitch a small letter A inside the pocket. Thank you.",
    price: "",
    ready: false,
    dispatchNote: null,
    ...overrides
  };
}

function pouch(): TemplateItem {
  return {
    name: "Gajih Pouch",
    quantity: 2,
    description: null,
    imageUrl: photo,
    baseColour: null,
    baseColourHex: null,
    handleColour: null,
    handleColourHex: null,
    options: [],
    note: null,
    price: "",
    ready: true,
    dispatchNote: "Packed within two working days."
  };
}

const LONG_NOTE =
  "Dear Anita,\nI would love the handles a little shorter than usual, about 22 cm, so that it sits on the shoulder. " +
  "Could the inside pocket sit on the left? Please also add the initials A & R in a soft cream thread, with a small <heart> next to them. " +
  "This is a gift for my mother, who loves the colour of dry grass in the late afternoon, so if the weave can lean a little golden, that would be perfect. " +
  "SupercalifragilisticexpialidociousSupercalifragilisticexpialidociousSupercalifragilisticexpialidocious. " +
  "I understand every piece is slightly different and I welcome that. Thank you for all the care you put into your work.";

type Scenario = {id: string; label: string; items: (lang: "en" | "id") => TemplateItem[]; contact: typeof fullContact | typeof emptyContact; name: string | null; screenshots: "all" | "few"};

const scenarios: Scenario[] = [
  {id: "photo", label: "One item with a photo", items: () => [tote()], contact: fullContact, name: "Anita Yan", screenshots: "all"},
  {id: "mixed", label: "A made piece and ready stock", items: () => [tote(), pouch()], contact: fullContact, name: "Rina Wijaya", screenshots: "few"},
  {id: "long-note", label: "A very long note", items: () => [tote({note: LONG_NOTE})], contact: fullContact, name: "Rina <b>Wijaya</b>", screenshots: "few"},
  {id: "no-photo", label: "No photo, no address or Instagram on file", items: () => [tote({imageUrl: null, options: [{label: "Size", value: "Medium"}]})], contact: emptyContact, name: null, screenshots: "few"}
];

function orderFor(scenario: Scenario, currency: "IDR" | "USD"): TemplateOrder {
  const items = scenario.items(currency === "IDR" ? "id" : "en").map((item, index) => ({
    ...item,
    price: currency === "IDR" ? (index === 0 ? "Rp 1,250,000" : "Rp 360,000") : index === 0 ? "$92" : "$24"
  }));
  return {
    orderRef: "NAT-48210369",
    currency,
    amount: currency === "IDR" ? (items.length > 1 ? "Rp 1,610,000" : "Rp 1,250,000") : items.length > 1 ? "$116" : "$92",
    bankName: "Bank Central Asia",
    accountName: "Natlovers",
    accountNumber: "0123456789",
    expiresAt: new Date("2026-11-18T10:30:00+07:00"),
    trackingCourier: "JNE",
    trackingNumber: "CGK0123456789",
    customerName: scenario.name,
    customerEmail: "customer@example.com",
    items
  };
}

function templatesFor(order: TemplateOrder, ctx: TemplateContext): Record<string, RenderedEmail> {
  return {
    "order-placed": buildOrderPlaced(order, ctx),
    "payment-received": buildPaymentReceived(order, ctx),
    "stage-received": buildStage(order, ctx, "received"),
    "stage-in-atelier": buildStage(order, ctx, "in_atelier"),
    "stage-finishing": buildStage(order, ctx, "finishing"),
    shipped: buildShipped(order, ctx),
    cancelled: buildCancelled(order, ctx),
    expired: buildExpired(order, ctx),
    "owner-new-order": buildOwnerNotice("placed", order, ctx),
    "owner-marked-paid": buildOwnerNotice("paid", order, ctx)
  };
}

async function main() {
  rmSync(outDir, {recursive: true, force: true});
  mkdirSync(outDir, {recursive: true});
  await new Promise<void>((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  const browser = await chromium.launch({channel: "chrome"});
  const context = await browser.newContext({deviceScaleFactor: 1});
  const page = await context.newPage();
  const index: string[] = [];
  let screenshots = 0;

  async function shoot(file: string, html: string, width: number, dark: boolean) {
    await page.setViewportSize({width, height: 900});
    await page.emulateMedia({colorScheme: dark ? "dark" : "light"});
    await page.goto(pathToFileURL(file).href, {waitUntil: "load"});
    await page.screenshot({path: file.replace(/\.html$/, `-${dark ? "dark-" : ""}${width}.png`), fullPage: true});
    screenshots += 1;
    void html;
  }

  for (const scenario of scenarios) {
    for (const currency of ["USD", "IDR"] as const) {
      const lang = currency === "IDR" ? "id" : "en";
      const dir = path.join(outDir, scenario.id, lang);
      mkdirSync(dir, {recursive: true});
      const ctx: TemplateContext = {baseUrl, contact: scenario.contact, senderAddress: "orders@natlovers.com", readyRange: lang === "id" ? "16 Desember - 30 Desember" : "16 December - 30 December"};
      const emails = templatesFor(orderFor(scenario, currency), ctx);
      for (const [name, rendered] of Object.entries(emails)) {
        const file = path.join(dir, `${name}.html`);
        writeFileSync(file, rendered.html);
        writeFileSync(path.join(dir, `${name}.txt`), `Subject: ${rendered.subject}\n\n${rendered.text}`);
        index.push(`<li>${scenario.id}/${lang}/${name}: ${rendered.subject}</li>`);
        const key = name === "order-placed" || name === "owner-new-order" || name === "shipped";
        if (scenario.screenshots === "all" || key) {
          await shoot(file, rendered.html, 600, false);
          await shoot(file, rendered.html, 375, false);
          if (scenario.id === "photo" || name === "order-placed") await shoot(file, rendered.html, 600, true);
        }
      }
    }
  }

  // Sign-in and waiting list (no order, so one scenario).
  const ctx: Omit<TemplateContext, "readyRange"> = {baseUrl, contact: fullContact, senderAddress: "orders@natlovers.com"};
  const extra: Record<string, RenderedEmail> = {
    "en/sign-in": buildSignIn("https://natlovers.com/api/auth/callback/email?token=example", ctx),
    "en/waiting-joined": buildWaitingJoined("en", "https://natlovers.com/waiting-list/unsubscribe?token=example", ctx),
    "id/waiting-joined": buildWaitingJoined("id", "https://natlovers.com/waiting-list/unsubscribe?token=example", ctx),
    "en/atelier-reopened": buildReopened("en", "December", "https://natlovers.com/waiting-list/unsubscribe?token=example", ctx),
    "id/atelier-reopened": buildReopened("id", "Desember", "https://natlovers.com/waiting-list/unsubscribe?token=example", ctx)
  };
  mkdirSync(path.join(outDir, "account", "en"), {recursive: true});
  mkdirSync(path.join(outDir, "account", "id"), {recursive: true});
  for (const [name, rendered] of Object.entries(extra)) {
    const file = path.join(outDir, "account", `${name}.html`);
    writeFileSync(file, rendered.html);
    writeFileSync(file.replace(/\.html$/, ".txt"), `Subject: ${rendered.subject}\n\n${rendered.text}`);
    index.push(`<li>account/${name}: ${rendered.subject}</li>`);
    await shoot(file, rendered.html, 600, false);
    await shoot(file, rendered.html, 375, false);
  }

  await browser.close();
  server.close();
  writeFileSync(path.join(outDir, "index.html"), `<!doctype html><meta charset="utf-8"><title>Email previews</title><ul>${index.join("")}</ul>`);
  console.log(`Wrote ${index.length} emails (HTML and text) and ${screenshots} screenshots to ${outDir}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
