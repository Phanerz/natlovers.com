import Link from "next/link";
import {AuthScreenBackdrop} from "@/components/auth-screen-backdrop";

function Sprig() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-9 w-9 shrink-0 text-forest-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    >
      <path d="M32 58 C30 44 34 30 30 14" />
      <path d="M30 14 C24 16 18 14 14 8" />
      <path d="M30 14 C36 12 40 6 40 2" />
      <path d="M31 30 C25 30 20 26 18 22" />
      <path d="M31 30 C37 28 41 24 42 20" />
      <path d="M31 44 C26 45 22 42 20 38" />
      <path d="M31 44 C36 43 40 40 41 36" />
    </svg>
  );
}

export default function SignedOutPage() {
  return (
    <main>
      <AuthScreenBackdrop>
        <div className="card motion-card flex w-full max-w-sm flex-col items-center gap-6 p-8 text-center sm:p-10">
          <Sprig />
          <div>
            <p className="muted text-forest-800">See you soon</p>
            <h1 className="mt-3 font-display text-2xl uppercase tracking-wide text-forest-900 sm:text-3xl">
              You&rsquo;ve been signed out
            </h1>
            <p className="mt-4 text-base leading-7 text-forest-700">Thank you for being part of Natlovers.</p>
          </div>
          <div className="flex w-full flex-col gap-3">
            <Link
              href="/login"
              className="glass-btn-primary w-full rounded-full px-6 py-3.5 text-base font-semibold text-sand-50"
            >
              Sign in again
            </Link>
            <Link
              href="/"
              className="glass-btn-secondary w-full rounded-full px-6 py-3.5 text-base font-semibold text-forest-800"
            >
              Back to home
            </Link>
          </div>
        </div>
      </AuthScreenBackdrop>
    </main>
  );
}
