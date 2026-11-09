import {randomBytes} from "node:crypto";
import {allowRequest} from "@/lib/rate-limit";
import {and, asc, count, eq, gt, isNull, sql} from "drizzle-orm";
import {z} from "zod";
import {db, rateLimitHits, waitingList} from "@/lib/db";
import {emailCopy, type Lang} from "@/lib/atelier-copy";
import {monthName} from "@/lib/atelier-limits";
import {renderEmail, sendEmail, siteUrl} from "@/lib/email";
import {getLimits, getMonthlyUsage} from "@/lib/limits";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export function parseEmail(value: unknown): string | null {
  const result = emailSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/waiting-list/unsubscribe?token=${encodeURIComponent(token)}`;
}

export {allowRequest};

// A confirmation email goes out only for a new address, or one coming back after the reopening notice.
// Joining again while already waiting sends nothing, so the form cannot be used to mail the same
// person over and over. An address that has unsubscribed is never emailed again by this form: the
// request is ignored silently, with the same answer as a new signup.
export function shouldSendJoinEmail(existing: {notifiedAt: Date | null; unsubscribedAt: Date | null} | undefined): boolean {
  if (!existing) return true;
  if (existing.unsubscribedAt != null) return false;
  return existing.notifiedAt != null;
}

export async function joinWaitingList(email: string, lang: Lang): Promise<void> {
  const token = randomBytes(24).toString("hex");
  const [existing] = await db.select().from(waitingList).where(eq(waitingList.email, email));
  if (existing?.unsubscribedAt) return;
  let unsubscribeToken = token;
  if (existing) {
    unsubscribeToken = existing.unsubscribeToken;
    // Joining again after being notified puts the person back on the list.
    await db.update(waitingList).set({unsubscribedAt: null, notifiedAt: null, language: lang}).where(eq(waitingList.id, existing.id));
  } else {
    await db.insert(waitingList).values({email, language: lang, unsubscribeToken: token});
  }
  if (!shouldSendJoinEmail(existing)) return;
  const t = emailCopy[lang];
  const html = renderEmail({
    heading: t.waitingHeading,
    paragraphs: [t.waitingBody],
    smallPrint: [`<a href="${unsubscribeUrl(unsubscribeToken)}" style="color:#52634e;">${t.unsubscribe}</a>`],
    footer: t.footer
  });
  await sendEmail({to: email, subject: t.waitingSubject, html});
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!token) return false;
  const rows = await db.update(waitingList).set({unsubscribedAt: new Date()}).where(eq(waitingList.unsubscribeToken, token)).returning({id: waitingList.id});
  return rows.length > 0;
}

export async function waitingListCount(): Promise<number> {
  const [row] = await db.select({value: count()}).from(waitingList).where(isNull(waitingList.unsubscribedAt));
  return row?.value ?? 0;
}

export async function waitingListRows() {
  return db.select().from(waitingList).orderBy(asc(waitingList.createdAt));
}

// Run on the first of each month. If the pieces cap is no longer reached, writes once to everyone
// waiting and records notified_at. Safe to run twice: notified entries are skipped.
export async function notifyWaitingList(now: Date, month: number): Promise<{notified: number; skipped: string | null}> {
  const [limits, used] = await Promise.all([getLimits(), getMonthlyUsage(db, now)]);
  if (used.PIECES >= limits.piecesMonthlyCap) return {notified: 0, skipped: "cap still reached"};

  const entries = await db.select().from(waitingList).where(and(isNull(waitingList.notifiedAt), isNull(waitingList.unsubscribedAt)));
  let notified = 0;
  for (const entry of entries) {
    const lang: Lang = entry.language === "id" ? "id" : "en";
    const t = emailCopy[lang];
    const html = renderEmail({
      heading: t.reopenedHeading,
      paragraphs: [t.reopenedBody(monthName(month, lang))],
      button: {label: t.browse, url: `${siteUrl()}/catalogue`},
      smallPrint: [`<a href="${unsubscribeUrl(entry.unsubscribeToken)}" style="color:#52634e;">${t.unsubscribe}</a>`],
      footer: t.footer
    });
    const result = await sendEmail({to: entry.email, subject: t.reopenedSubject, html});
    if (result.ok) {
      await db.update(waitingList).set({notifiedAt: new Date()}).where(eq(waitingList.id, entry.id));
      notified += 1;
    }
  }
  return {notified, skipped: null};
}
