// The Natlovers email frame: the "Make it yours" order note, rebuilt for the inbox.
//
// Pure functions only (no database, no mail client), so the same code renders the real emails, the
// preview script and the tests. Table layout and inline styles throughout, because mail clients ignore
// most of modern CSS. One document model goes in; HTML and a plain-text twin come out.
//
// Tokens are copied from the order note in app/globals.css (.pdp-customise, .pdp-note-*, .pdp-receipt):
// cream paper #f6efe0, brown ink, dotted dividers, a serif italic title, small spaced capitals for
// labels, a strip of tape at the top, a dark green pill button. Emails use only system fonts.

import {instagramUrl, whatsappLink} from "@/lib/studio-contact";
import type {EmailLang, emailStrings} from "@/lib/email-copy";

export type EmailStrings = (typeof emailStrings)[EmailLang];

export type EmailContact = {
  address?: string;
  email?: string;
  whatsapp?: {name: string; number: string}[];
  instagram?: string;
};

export type EmailOption = {label: string; value: string; hex?: string | null};

export type EmailItemCard = {
  name: string;
  quantityLabel: string;
  description?: string | null;
  // An absolute https URL that serves a JPEG or PNG. Null shows the card without a photo.
  imageUrl?: string | null;
  options: EmailOption[];
  note?: string | null;
  price: string;
};

export type EmailBlock =
  | {type: "greeting"; text: string}
  | {type: "p"; text: string}
  | {type: "rows"; heading?: string; rows: {label: string; value: string; spaced?: boolean}[]}
  | {type: "items"; heading: string; items: EmailItemCard[]; photoNote?: string}
  | {type: "promise"; heading: string; lines: string[]}
  | {type: "button"; label: string; url: string}
  | {type: "small"; text: string; link?: {label: string; url: string}};

export type EmailDocument = {
  lang: EmailLang;
  t: EmailStrings;
  subject: string;
  preheader: string;
  // The small spaced-capitals line under the logo, in the order-note style.
  label: string;
  title: string;
  blocks: EmailBlock[];
  contact: EmailContact;
  // Where hosted images live, for example https://natlovers.com (no trailing slash).
  baseUrl: string;
  // The address the email is sent from. The "add to your contacts" line shows only for a natlovers.com
  // address, so it never points at a sender that is not ours.
  senderAddress?: string | null;
  // Owner emails skip the customer signature block.
  compactFooter?: boolean;
};

export type RenderedEmail = {subject: string; html: string; text: string};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const PAPER = "#f6efe0";
const PAPER_DEEP = "#efe5d0";
const OUTER = "#ebe3d1";
const INK = "#2b241a";
const SOFT = "#4a4132";
const MUTED = "#5f5543";
const LINE = "#c9bca2";
const GREEN = "#344332";

const SERIF = "'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,serif";
const SANS = "'Trebuchet MS','Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'Courier New',Courier,monospace";

const labelStyle = `font-family:${MONO};font-size:11px;line-height:16px;letter-spacing:0.2em;text-transform:uppercase;color:${MUTED};`;
const bodyStyle = `font-family:${SANS};font-size:16px;line-height:25px;color:${SOFT};`;
const dotted = `1px dotted ${LINE}`;

// ---------------------------------------------------------------------------
// Escaping and small helpers
// ---------------------------------------------------------------------------

// Every customer-supplied value (name, note, address) goes through this before it reaches HTML.
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Text for the plain-text part: control characters out, nothing else changed (plain text has no markup).
export function plain(value: unknown): string {
  // eslint-disable-next-line no-control-regex
  return String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\r\n?/g, "\n");
}

// A subject is one line of ordinary text.
export function cleanSubject(value: string): string {
  return plain(value).replace(/\s+/g, " ").trim();
}

function multiline(value: string): string {
  return escapeHtml(plain(value)).replace(/\n/g, "<br>");
}

// Only web and mail links are ever written into an href.
export function safeUrl(value: string | null | undefined): string | null {
  const url = (value ?? "").trim();
  return /^(https?:\/\/|mailto:)[^\s"'<>]+$/i.test(url) ? url : null;
}

function safeHex(value: string | null | undefined): string | null {
  const hex = (value ?? "").trim();
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex) ? hex : null;
}

function absolute(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

export function senderAddressOf(from: string): string | null {
  const match = from.match(/<([^<>\s]+@[^<>\s]+)>/) ?? from.match(/^([^<>\s]+@[^<>\s]+)$/);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function img(src: string, alt: string, width: number, extra = ""): string {
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="${width}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;${extra}">`;
}

function swatch(hex: string | null): string {
  if (!hex) return `<td width="22" style="width:22px;font-size:0;line-height:0;">&nbsp;</td>`;
  return `<td width="22" valign="middle" style="width:22px;padding:4px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="14" height="14" bgcolor="${hex}" style="width:14px;height:14px;background-color:${hex};border:1px solid #8a7b5e;border-radius:7px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td></tr></table></td>`;
}

function optionRows(options: EmailOption[]): string {
  if (!options.length) return "";
  const rows = options
    .map((option) => {
      const hex = safeHex(option.hex);
      return `<tr>${swatch(hex)}<td valign="middle" style="padding:3px 0;${bodyStyle}font-size:15px;line-height:21px;"><span style="color:${MUTED};">${escapeHtml(option.label)}:</span> <span style="color:${INK};">${escapeHtml(option.value)}</span></td></tr>`;
    })
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;">${rows}</table>`;
}

function noteBox(label: string, note: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;"><tr><td bgcolor="${PAPER_DEEP}" style="background-color:${PAPER_DEEP};border:${dotted};border-radius:4px;padding:12px 14px;"><div style="${labelStyle}">${escapeHtml(label)}</div><div style="margin-top:6px;font-family:${SERIF};font-style:italic;font-size:17px;line-height:25px;color:${INK};word-break:break-word;overflow-wrap:anywhere;">${multiline(note)}</div></td></tr></table>`;
}

function itemCard(item: EmailItemCard, t: EmailStrings): string {
  const photo = item.imageUrl && safeUrl(item.imageUrl)
    ? `<td width="104" valign="top" style="width:104px;padding-right:16px;">${img(item.imageUrl, item.name, 104, `border-radius:6px;border:1px solid ${LINE};`)}</td>`
    : "";
  const meta = `${item.quantityLabel} · ${item.price}`;
  const description = item.description?.trim()
    ? `<div style="margin-top:6px;${bodyStyle}font-size:15px;line-height:22px;">${multiline(item.description.trim())}</div>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:${dotted};"><tr><td style="padding:16px 0 12px 0;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>${photo}<td valign="top">
      <div style="font-family:${SERIF};font-style:italic;font-size:21px;line-height:27px;color:${INK};">${escapeHtml(item.name)}</div>
      <div style="margin-top:2px;${labelStyle}">${escapeHtml(meta)}</div>
      ${description}
      ${optionRows(item.options)}
    </td></tr></table>
    ${item.note?.trim() ? noteBox(t.yourNote, item.note.trim()) : ""}
  </td></tr></table>`;
}

function button(label: string, url: string): string {
  const href = safeUrl(url);
  if (!href) return "";
  const text = escapeHtml(label);
  const link = escapeHtml(href);
  // The VML block gives Outlook a real rounded button; every other client uses the padded link.
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px 0;"><tr><td bgcolor="${GREEN}" style="background-color:${GREEN};border-radius:999px;">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${link}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fillcolor="${GREEN}"><w:anchorlock xmlns:w="urn:schemas-microsoft-com:office:word"/><center style="color:${PAPER};font-family:${SANS};font-size:15px;font-weight:bold;">${text}</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="${link}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:15px;line-height:18px;font-weight:600;letter-spacing:0.02em;color:${PAPER};text-decoration:none;border-radius:999px;">${text}</a><!--<![endif]-->
  </td></tr></table>`;
}

function rowsTable(heading: string | undefined, rows: {label: string; value: string; spaced?: boolean}[]): string {
  const body = rows
    .map(
      (row) =>
        `<tr><td valign="top" style="padding:9px 12px 9px 0;border-bottom:${dotted};${labelStyle}">${escapeHtml(row.label)}</td><td align="right" valign="top" style="padding:8px 0;border-bottom:${dotted};font-family:${SANS};font-size:16px;line-height:23px;color:${INK};${row.spaced ? "letter-spacing:0.06em;" : ""}word-break:break-word;">${multiline(row.value)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:22px;border-top:${dotted};">${heading ? `<tr><td colspan="2" style="padding:16px 0 4px 0;${labelStyle}">${escapeHtml(heading)}</td></tr>` : ""}${body}</table>`;
}

function promise(heading: string, lines: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:22px;border-top:${dotted};"><tr><td style="padding:16px 0 0 0;"><div style="${labelStyle}">${escapeHtml(heading)}</div>${lines
    .map((line) => `<div style="margin-top:8px;${bodyStyle}">${multiline(line)}</div>`)
    .join("")}</td></tr></table>`;
}

function contactLines(contact: EmailContact, t: EmailStrings): {label: string; text: string; href?: string; parts?: {text: string; href: string}[]}[] {
  const lines: {label: string; text: string; href?: string; parts?: {text: string; href: string}[]}[] = [];
  if (contact.address?.trim()) lines.push({label: t.contactAddress, text: contact.address.trim()});
  const numbers = (contact.whatsapp ?? []).filter((entry) => entry.number?.trim());
  if (numbers.length) {
    lines.push({
      label: t.contactWhatsApp,
      text: numbers.map((entry) => `${entry.name ? `${entry.name} ` : ""}${entry.number.trim()}`).join(" · "),
      parts: numbers.map((entry) => ({text: `${entry.name ? `${entry.name} ` : ""}${entry.number.trim()}`, href: whatsappLink(entry.number)}))
    });
  }
  if (contact.email?.trim()) lines.push({label: t.contactEmail, text: contact.email.trim(), href: `mailto:${contact.email.trim()}`});
  const instagram = instagramUrl(contact.instagram);
  if (instagram) lines.push({label: t.contactInstagram, text: `@${instagram.replace(/^https:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "")}`, href: instagram});
  return lines;
}

function signature(doc: EmailDocument): string {
  const {t, contact} = doc;
  const lines = contactLines(contact, t);
  const contactHtml = lines
    .map((line) => {
      const href = line.href ? safeUrl(line.href) : null;
      const text = line.parts
        ? line.parts.map((part) => (safeUrl(part.href) ? `<a href="${escapeHtml(part.href)}" style="color:${INK};text-decoration:underline;white-space:nowrap;">${escapeHtml(part.text)}</a>` : escapeHtml(part.text))).join(" · ")
        : href ? `<a href="${escapeHtml(href)}" style="color:${INK};text-decoration:underline;">${escapeHtml(line.text)}</a>` : escapeHtml(line.text);
      return `<tr><td valign="top" style="padding:3px 12px 3px 0;width:96px;${labelStyle}">${escapeHtml(line.label)}</td><td valign="top" style="padding:3px 0;font-family:${SANS};font-size:14px;line-height:20px;color:${SOFT};">${text}</td></tr>`;
    })
    .join("");
  const addContact = doc.senderAddress && /@natlovers\.com$/i.test(doc.senderAddress) ? t.addContact(doc.senderAddress) : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:30px;border-top:${dotted};"><tr><td style="padding:22px 0 0 0;">
    ${img(absolute(doc.baseUrl, "/email/logo.png"), "Natlovers", 120)}
    <div style="margin-top:10px;font-family:${SERIF};font-style:italic;font-size:17px;line-height:24px;color:${INK};">${escapeHtml(t.tagline)}</div>
    <div style="margin-top:4px;${labelStyle}">${escapeHtml(t.since)}</div>
    ${contactHtml ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">${contactHtml}</table>` : ""}
    <div style="margin-top:16px;font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(t.automated)}</div>
    ${addContact ? `<div style="margin-top:8px;font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(addContact)}</div>` : ""}
  </td></tr></table>`;
}

function renderBlock(block: EmailBlock, doc: EmailDocument): string {
  switch (block.type) {
    case "greeting":
      return `<p style="margin:0 0 14px 0;${bodyStyle}color:${INK};">${escapeHtml(block.text)}</p>`;
    case "p":
      return `<p style="margin:0 0 16px 0;${bodyStyle}">${multiline(block.text)}</p>`;
    case "rows":
      return rowsTable(block.heading, block.rows);
    case "items": {
      const cards = block.items.map((item) => itemCard(item, doc.t)).join("");
      const caption = block.photoNote
        ? `<p style="margin:12px 0 0 0;font-family:${SERIF};font-style:italic;font-size:15px;line-height:22px;color:${MUTED};">${escapeHtml(block.photoNote)}</p>`
        : "";
      return `<div style="margin-top:22px;${labelStyle}">${escapeHtml(block.heading)}</div><div style="margin-top:10px;">${cards}<div style="border-top:${dotted};font-size:0;line-height:0;">&nbsp;</div></div>${caption}`;
    }
    case "promise":
      return promise(block.heading, block.lines);
    case "button":
      return button(block.label, block.url);
    case "small": {
      const href = block.link ? safeUrl(block.link.url) : null;
      const link = block.link && href ? ` <a href="${escapeHtml(href)}" style="color:${INK};text-decoration:underline;">${escapeHtml(block.link.label)}</a>` : "";
      return `<p style="margin:16px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED};">${multiline(block.text)}${link}</p>`;
    }
  }
}

// ---------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------

export function renderEmail(doc: EmailDocument): RenderedEmail {
  const subject = cleanSubject(doc.subject);
  const body = doc.blocks.map((block) => renderBlock(block, doc)).join("\n");
  const footer = doc.compactFooter
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:26px;border-top:${dotted};"><tr><td style="padding:16px 0 0 0;font-family:${SANS};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(doc.t.automated)}</td></tr></table>`
    : signature(doc);
  // The preheader is the grey line beside the subject. The padding stops the body text leaking into it.
  const preheader = `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(doc.preheader)}${"&#847;&zwnj;&nbsp;".repeat(40)}</div>`;
  const paperTexture = `background-image:url('${absolute(doc.baseUrl, "/email/paper.png")}');`;

  const html = `<!doctype html>
<html lang="${doc.lang}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0; mso-table-rspace: 0; }
  img { -ms-interpolation-mode: bicubic; }
  @media only screen and (max-width: 620px) {
    .nl-outer { padding: 12px 8px !important; }
    .nl-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .nl-title { font-size: 28px !important; line-height: 34px !important; }
  }
  /* The paper keeps its own light colours in dark mode, as the note does on the site; only the table it lies on darkens. */
  @media (prefers-color-scheme: dark) {
    body, .nl-bg { background-color: #1d241b !important; }
  }
</style>
</head>
<body bgcolor="${OUTER}" style="margin:0;padding:0;background-color:${OUTER};">
${preheader}
<table role="presentation" class="nl-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${OUTER}" style="background-color:${OUTER};">
<tr><td class="nl-outer" align="center" style="padding:28px 12px 36px 12px;">
  <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="width:100%;max-width:600px;background-color:${PAPER};${paperTexture}border-radius:4px;box-shadow:0 0 0 1px rgba(90,70,40,0.14),0 2px 4px rgba(20,14,6,0.22),0 22px 38px -14px rgba(20,14,6,0.5);">
    <tr><td align="center" style="padding:10px 0 0 0;">${img(absolute(doc.baseUrl, "/email/tape.png"), "", 120)}</td></tr>
    <tr><td class="nl-pad" style="padding:14px 40px 36px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="left">${img(absolute(doc.baseUrl, "/email/logo.png"), "Natlovers", 180)}</td></tr></table>
      <div style="margin-top:18px;${labelStyle}">${escapeHtml(doc.label)}</div>
      <h1 class="nl-title" style="margin:10px 0 0 0;font-family:${SERIF};font-style:italic;font-weight:400;font-size:32px;line-height:38px;color:${INK};">${escapeHtml(doc.title)}</h1>
      <div style="margin:16px 0 18px 0;border-top:${dotted};font-size:0;line-height:0;">&nbsp;</div>
      ${body}
      ${footer}
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;

  return {subject, html, text: renderText(doc)};
}

// ---------------------------------------------------------------------------
// The plain-text twin
// ---------------------------------------------------------------------------

function renderText(doc: EmailDocument): string {
  const {t} = doc;
  const out: string[] = [doc.label.toUpperCase(), "", plain(doc.title), ""];
  for (const block of doc.blocks) {
    switch (block.type) {
      case "greeting":
      case "p":
        out.push(plain(block.text), "");
        break;
      case "rows":
        if (block.heading) out.push(plain(block.heading));
        for (const row of block.rows) out.push(`${plain(row.label)}: ${plain(row.value)}`);
        out.push("");
        break;
      case "items":
        out.push(plain(block.heading), "");
        for (const item of block.items) {
          out.push(`${plain(item.name)} (${plain(item.quantityLabel)})`);
          if (item.description?.trim()) out.push(plain(item.description.trim()));
          for (const option of item.options) out.push(`  ${plain(option.label)}: ${plain(option.value)}`);
          if (item.note?.trim()) out.push(`  ${plain(t.yourNote)}: ${plain(item.note.trim())}`);
          out.push(`  ${plain(t.price)}: ${plain(item.price)}`, "");
        }
        if (block.photoNote) out.push(plain(block.photoNote), "");
        break;
      case "promise":
        out.push(plain(block.heading), ...block.lines.map(plain), "");
        break;
      case "button":
        if (safeUrl(block.url)) out.push(`${plain(block.label)}: ${block.url}`, "");
        break;
      case "small":
        out.push(plain(block.text) + (block.link && safeUrl(block.link.url) ? ` ${plain(block.link.label)}: ${block.link.url}` : ""), "");
        break;
    }
  }
  out.push("--");
  if (!doc.compactFooter) {
    out.push("Natlovers", plain(t.tagline), plain(t.since));
    for (const line of contactLines(doc.contact, t)) out.push(`${plain(line.label)}: ${plain(line.text)}`);
    out.push("");
  }
  out.push(plain(t.automated));
  if (!doc.compactFooter && doc.senderAddress && /@natlovers\.com$/i.test(doc.senderAddress)) out.push(plain(t.addContact(doc.senderAddress)));
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
