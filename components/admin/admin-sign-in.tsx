"use client";

import {signIn} from "next-auth/react";
import {AuthScreenBackdrop} from "@/components/auth-screen-backdrop";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3c-7.6 0-14.1 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.1 26.7 37 24 37c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.9 40.6 16.4 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.4-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

function CloverIcon() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 text-forest-700" fill="none" aria-hidden>
      <g fill="currentColor" opacity="0.9">
        <circle cx="20" cy="12" r="6.4" />
        <circle cx="28" cy="20" r="6.4" />
        <circle cx="20" cy="28" r="6.4" />
        <circle cx="12" cy="20" r="6.4" />
      </g>
      <path d="M20 20 L20 34" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function AdminSignIn() {
  return (
    <AuthScreenBackdrop>
      <div className="card motion-card flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-6 p-8 text-center sm:p-10">
        <div className="flex flex-col items-center gap-4">
          <CloverIcon />
          <div>
            <p className="muted text-forest-800">Admin</p>
            <h1 className="mt-3 font-display text-2xl uppercase tracking-wide text-forest-900 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-4 text-base leading-7 text-forest-700">
              Only approved Natlovers Google accounts can access this page.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signIn("google-admin", {callbackUrl: "/mimin"})}
          className="glass-btn-secondary flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-base font-semibold text-forest-900"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </AuthScreenBackdrop>
  );
}
