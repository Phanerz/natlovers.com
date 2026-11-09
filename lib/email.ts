import {Resend} from "resend";
import {logFailure} from "@/lib/safe-log";

// The sender and the key are the ones the sign-in email already uses.
export const emailFrom = process.env.RESEND_FROM_EMAIL ?? "Natlovers <onboarding@resend.dev>";

// Lazy and guarded: Resend throws if constructed without a key, which would crash every route that
// imports this file (build-time page data collection included).
let resendClient: Resend | null = null;
export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export type EmailLayoutInput = {
  heading: string;
  // Paragraphs of plain text; each is escaped.
  paragraphs: string[];
  // Optional label and value rows, shown as a small table.
  rows?: {label: string; value: string}[];
  button?: {label: string; url: string};
  smallPrint?: string[];
  footer: string;
};

// The Natlovers email layout: cream card on pale green, a serif heading, a pill button. The sign-in
// email and every order email render through this one function.
export function renderEmail(input: EmailLayoutInput): string {
  const paragraphs = input.paragraphs
    .filter(Boolean)
    .map(
      (text) =>
        `<p style="margin:0 0 20px; font-size:15px; line-height:1.6; color:#344332;">${escapeHtml(text)}</p>`
    )
    .join("");
  const rows = input.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px; text-align:left; border-top:1px solid #dde5dc;">${input.rows
        .map(
          (row) =>
            `<tr><td style="padding:10px 0; border-bottom:1px solid #dde5dc; font-size:13px; color:#52634e;">${escapeHtml(row.label)}</td><td style="padding:10px 0; border-bottom:1px solid #dde5dc; font-size:15px; color:#172015; text-align:right;">${escapeHtml(row.value)}</td></tr>`
        )
        .join("")}</table>`
    : "";
  const button = input.button
    ? `<a href="${escapeHtml(input.button.url)}" style="display:inline-block; padding:14px 32px; background:#172015; color:#fbf8f1; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; letter-spacing:0.02em;">${escapeHtml(input.button.label)}</a>`
    : "";
  const smallPrint = (input.smallPrint ?? [])
    .filter(Boolean)
    .map((text) => `<p style="margin:20px 0 0; font-size:13px; line-height:1.6; color:#52634e;">${text}</p>`)
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin:0; padding:32px 16px; background:#f2f5f1; font-family:'Trebuchet MS', 'Segoe UI', sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto;">
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <span style="font-family:Georgia, 'Times New Roman', serif; font-size:22px; letter-spacing:0.08em; color:#172015; text-transform:uppercase;">Natlovers</span>
            </td>
          </tr>
          <tr>
            <td style="background:#fbf8f1; border:1px solid #dde5dc; border-radius:20px; padding:40px 32px; text-align:center;">
              <h1 style="margin:0 0 16px; font-family:Georgia, 'Times New Roman', serif; font-size:24px; font-weight:400; color:#172015;">${escapeHtml(input.heading)}</h1>
              ${paragraphs}
              ${rows}
              ${button}
              ${smallPrint}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px; text-align:center; font-size:12px; color:#6c8667;">
              ${escapeHtml(input.footer)}
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export type SendResult = {ok: boolean; skipped?: boolean};

// Sends one email. Never throws: a failed email must never block or roll back the action that
// caused it, so the failure is logged and the caller carries on.
export async function sendEmail(input: {to: string | string[]; subject: string; html: string}): Promise<SendResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error(`Email not sent (RESEND_API_KEY is not set): ${input.subject}`);
      return {ok: false, skipped: true};
    }
    const {error} = await resend.emails.send({from: emailFrom, to: input.to, subject: input.subject, html: input.html});
    if (error) {
      console.error(`Email failed (${input.subject}): ${error.name}`);
      return {ok: false};
    }
    return {ok: true};
  } catch (error) {
    logFailure(`Email failed (${input.subject})`, error);
    return {ok: false};
  }
}
