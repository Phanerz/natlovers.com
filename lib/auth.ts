import {cache} from "react";
import type {NextAuthOptions} from "next-auth";
import {getServerSession} from "next-auth/next";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import {DrizzleAdapter} from "@auth/drizzle-adapter";
import {Resend} from "resend";
import {db} from "@/lib/db";
import {accounts, sessions, users, verificationTokens} from "@/lib/db/schema";
import {renderEmail} from "@/lib/email";

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

const magicLinkFrom = process.env.RESEND_FROM_EMAIL ?? "Natlovers <onboarding@resend.dev>";

// Lazy + guarded: Resend throws synchronously if constructed without a key,
// which previously crashed every route importing this file (build-time page
// data collection included) whenever RESEND_API_KEY was unset.
let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function magicLinkEmailHtml(url: string) {
  return renderEmail({
    heading: "Sign in to Natlovers",
    paragraphs: ["Click the button below to sign in to your account. This link expires in 24 hours and can only be used once."],
    button: {label: "Sign in", url},
    smallPrint: ["If you did not request this email, you can safely ignore it. No account changes will be made."],
    footer: "Handmade natural fiber goods from Yogyakarta, Indonesia."
  });
}

export const authOptions: NextAuthOptions = {
  // @auth/drizzle-adapter's own types expect these tables in their
  // pre-`.enableRLS()` shape (its type still requires `enableRLS` to be a
  // callable method it never actually calls)  -  a type-only mismatch from
  // enabling RLS on the NextAuth tables in schema.ts, not a runtime one;
  // the adapter works from the table's columns/name, which are unchanged.
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any),
  providers: [
    GoogleProvider({
      id: "google-admin",
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    }),
    // Same Google OAuth app as the admin provider, registered under a
    // second id so the signIn callback can tell them apart and only gate
    // the admin one with ADMIN_EMAILS. allowDangerousEmailAccountLinking
    // is safe here specifically because Google verifies the email itself  - 
    // a customer who signed up via magic link and later hits "Continue
    // with Google" on the same address should land in the same account
    // rather than hit a linking conflict.
    GoogleProvider({
      id: "google-customer",
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true
    }),
    EmailProvider({
      from: magicLinkFrom,
      async sendVerificationRequest({identifier, url}) {
        const resend = getResendClient();
        if (!resend) {
          throw new Error("RESEND_API_KEY is not configured, so the magic-link email cannot be sent.");
        }
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
    // google-admin is the admin login  -  the allowlist is what actually
    // gates entry, since proving who you are via Google says nothing about
    // whether you should have admin access. Fails closed if ADMIN_EMAILS
    // isn't configured. google-customer and the email/magic-link provider
    // are the customer login paths and aren't gated  -  any address can
    // complete them.
    async signIn({user, account}) {
      if (account?.provider === "google-admin") {
        return isAdminEmail(user.email);
      }
      return true;
    },
    // Database sessions don't carry the user id onto session.user by
    // default  -  /api/account needs it to know which row to read/update.
    async session({session, user}) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    }
  }
};

// Every /mimin/* page calls this once in the shared layout (the auth gate)
// and again in the page itself (to read the email/name for display)  -  two
// separate, uncached getServerSession calls each do their own session+user
// DB round trip. cache() memoizes it per request (React's request-scoped
// cache, not a persistent one), so both calls within the same page render
// share one query instead of two, halving the auth-related load this
// connection pool sees on every single admin page view.
export const getSession = cache(() => getServerSession(authOptions));
