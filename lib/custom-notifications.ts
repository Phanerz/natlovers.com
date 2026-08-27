import {eq} from "drizzle-orm";
import {Resend} from "resend";
import {db, users} from "@/lib/db";
import {formatCurrency} from "@/lib/format";
import {summariseConfig} from "@/lib/custom-studio";
import {ESTIMATE_DISCLAIMER} from "@/lib/custom-pricing";
import type {CustomRequestView} from "@/lib/custom-requests";

// Reuses the Resend client and the visual language already established by
// the magic-link email in lib/auth.ts, rather than introducing a second mail
// path. There is deliberately no in-app messaging system here: a real
// customer conversation is its own project, and the studio already reaches
// people by email and WhatsApp.

const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Natlovers <onboarding@resend.dev>";

// Lazy, same reasoning as lib/auth.ts's getResendClient  -  this module is
// imported at build/page-data-collection time, before the functions below
// (and their own RESEND_API_KEY guards) ever run.
let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function shell(heading: string, bodyHtml: string) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0; padding:32px 16px; background:#f2f5f1; font-family:'Trebuchet MS', 'Segoe UI', sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; margin:0 auto;">
          <tr>
            <td style="padding-bottom:24px; text-align:center;">
              <span style="font-family:Georgia, 'Times New Roman', serif; font-size:22px; letter-spacing:0.08em; color:#172015; text-transform:uppercase;">Natlovers</span>
            </td>
          </tr>
          <tr>
            <td style="background:#fbf8f1; border:1px solid #dde5dc; border-radius:20px; padding:40px 32px;">
              <h1 style="margin:0 0 16px; font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#172015;">${heading}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px; text-align:center; font-size:12px; color:#94aa90;">
              Handmade natural fiber goods from Yogyakarta, Indonesia.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function configRows(request: CustomRequestView): string {
  return summariseConfig(request.configuration)
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 12px 6px 0; font-size:13px; color:#6c8667; white-space:nowrap;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0; font-size:14px; color:#172015;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join("");
}

// Sent once, immediately after a request is submitted. Failures are caught
// by the caller and logged, since the commission is already stored, so a
// mail outage must not surface to the customer as a failed submission.
export async function sendCustomRequestReceivedEmail(userId: string, request: CustomRequestView): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY is not set, skipping the custom request confirmation email.");
    return;
  }

  const [customer] = await db.select({email: users.email, name: users.name}).from(users).where(eq(users.id, userId)).limit(1);

  if (!customer?.email) {
    return;
  }

  const greeting = customer.name ? `Hi ${escapeHtml(customer.name.split(" ")[0])},` : "Hi,";
  const price = request.estimatedPriceIdr > 0 ? formatCurrency(request.estimatedPriceIdr, request.currency) : null;

  const body = `
    <p style="margin:0 0 20px; font-size:15px; line-height:1.7; color:#344332;">
      ${greeting} thank you for your custom request. It's with the studio now and someone will review it personally.
    </p>
    <p style="margin:0 0 8px; font-size:13px; color:#6c8667;">Your reference</p>
    <p style="margin:0 0 24px; font-family:Georgia, serif; font-size:20px; color:#172015;">${escapeHtml(request.requestRef ?? "")}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-top:1px solid #dde5dc; border-bottom:1px solid #dde5dc; padding:8px 0; margin-bottom:20px;">
      ${configRows(request)}
    </table>
    ${
      price
        ? `<p style="margin:0 0 6px; font-size:14px; color:#344332;"><strong>Estimated total:</strong> ${escapeHtml(price)}</p>
           <p style="margin:0 0 24px; font-size:12px; line-height:1.6; color:#6c8667;">${escapeHtml(ESTIMATE_DISCLAIMER)}</p>`
        : `<p style="margin:0 0 24px; font-size:13px; line-height:1.6; color:#6c8667;">The studio will send you a quote once they've reviewed your request.</p>`
    }
    <p style="margin:0; font-size:13px; line-height:1.7; color:#6c8667;">
      What happens next: the studio reviews your request, confirms the final design and price with you, and production begins once you've approved it.
    </p>
  `;

  const {error} = await getResendClient().emails.send({
    from: fromAddress,
    to: customer.email,
    subject: `Custom request received  -  ${request.requestRef}`,
    html: shell("We've got your request", body)
  });

  if (error) {
    throw new Error(`Resend failed to send the custom request confirmation: ${error.message}`);
  }
}

// Sent by an admin from the request detail view. The message body is
// whatever they typed  -  this is a courier, not a template engine, so the
// studio keeps its own voice.
export async function sendCustomRequestMessage(input: {
  toEmail: string;
  requestRef: string;
  subject: string;
  message: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set.");
  }

  const paragraphs = input.message
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px; font-size:15px; line-height:1.7; color:#344332;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`
    )
    .join("");

  const body = `
    ${paragraphs}
    <p style="margin:24px 0 0; font-size:12px; color:#94aa90;">Regarding custom request ${escapeHtml(input.requestRef)}</p>
  `;

  const {error} = await getResendClient().emails.send({
    from: fromAddress,
    to: input.toEmail,
    subject: input.subject,
    html: shell("A note from the studio", body)
  });

  if (error) {
    throw new Error(`Resend failed to send the message: ${error.message}`);
  }
}
