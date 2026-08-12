import type {NextAuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import {DrizzleAdapter} from "@auth/drizzle-adapter";
import {Resend} from "resend";
import {db} from "@/lib/db";
import {accounts, sessions, users, verificationTokens} from "@/lib/db/schema";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }
  return getAdminEmails().includes(email.toLowerCase());
}

const resend = new Resend(process.env.RESEND_API_KEY);
const magicLinkFrom = process.env.RESEND_FROM_EMAIL ?? "Natlovers <onboarding@resend.dev>";

function magicLinkEmailHtml(url: string) {
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
              <h1 style="margin:0 0 12px; font-family:Georgia, 'Times New Roman', serif; font-size:24px; color:#172015;">Sign in to Natlovers</h1>
              <p style="margin:0 0 28px; font-size:15px; line-height:1.6; color:#344332;">
                Click the button below to sign in to your account. This link expires in 24 hours and can only be used once.
              </p>
              <a href="${url}" style="display:inline-block; padding:14px 32px; background:#172015; color:#fbf8f1; border-radius:999px; text-decoration:none; font-size:14px; font-weight:600; letter-spacing:0.02em;">
                Sign in
              </a>
              <p style="margin:28px 0 0; font-size:13px; line-height:1.6; color:#6c8667;">
                If you didn't request this email, you can safely ignore it. No account changes will be made.
              </p>
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

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
    EmailProvider({
      from: magicLinkFrom,
      async sendVerificationRequest({identifier, url}) {
        const {error} = await resend.emails.send({
          from: magicLinkFrom,
          to: identifier,
          subject: "Sign in to Natlovers",
          html: magicLinkEmailHtml(url)
        });

        if (error) {
          throw new Error(`Resend failed to send verification email: ${error.message}`);
        }
      }
    })
  ],
  // Sliding expiration: every visit while the session is more than
  // updateAge away from expiring pushes the expiry forward by maxAge again,
  // so an active admin or customer never gets signed out mid-use, but 3
  // days of no visits at all lets the session lapse. Shared by both the
  // Google (admin) and email (customer) providers since they run through
  // the same session store.
  session: {
    strategy: "database",
    maxAge: 3 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/mimin"
  },
  callbacks: {
    // Google is the admin login — the allowlist is what actually gates
    // entry, since proving who you are via Google says nothing about
    // whether you should have admin access. Fails closed if ADMIN_EMAILS
    // isn't configured. The email/magic-link provider is the customer
    // login path and isn't gated — any address can complete it.
    async signIn({user, account}) {
      if (account?.provider === "google") {
        return isAdminEmail(user.email);
      }
      return true;
    },
    // Database sessions don't carry the user id onto session.user by
    // default — /api/account needs it to know which row to read/update.
    async session({session, user}) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    }
  }
};
