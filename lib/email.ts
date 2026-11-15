import {Resend} from "resend";
import {logFailure} from "@/lib/safe-log";
import {senderAddressOf} from "@/lib/email-layout";

// Where mail comes from. EMAIL_FROM wins, then RESEND_FROM_EMAIL (the variable the sign-in email has
// always used), then the original sender, so nothing changes until EMAIL_FROM is set.
const DEFAULT_FROM = "Natlovers <onboarding@resend.dev>";

export function emailFrom(): string {
  return process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

// Where replies go. Unset means no Reply-To header, exactly as before.
export function emailReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO?.trim() || undefined;
}

// The bare address behind emailFrom(), for the "add us to your contacts" line.
export function emailSenderAddress(): string | null {
  return senderAddressOf(emailFrom());
}

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

export type SendResult = {ok: boolean; skipped?: boolean};

export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  html: string;
  // The plain-text twin. Every email carries one: mail with only an HTML part is judged more harshly.
  text: string;
  headers?: Record<string, string>;
};

// Sends one email. Never throws: a failed email must never block or roll back the action that
// caused it, so the failure is logged and the caller carries on. No open or click tracking is added
// here: links are the real addresses and there is no tracking pixel.
export async function sendEmail(input: OutgoingEmail): Promise<SendResult> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.error(`Email not sent (RESEND_API_KEY is not set): ${input.subject}`);
      return {ok: false, skipped: true};
    }
    const replyTo = emailReplyTo();
    const {error} = await resend.emails.send({
      from: emailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(replyTo ? {replyTo} : {}),
      ...(input.headers ? {headers: input.headers} : {})
    });
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
