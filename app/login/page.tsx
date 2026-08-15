"use client";

import {FormEvent, useState} from "react";
import {signIn} from "next-auth/react";
import {AuthScreenBackdrop} from "@/components/auth-screen-backdrop";

type Status = "idle" | "submitting" | "sent" | "error";

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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("submitting");

    const result = await signIn("email", {email, redirect: false, callbackUrl: "/"});

    if (result?.error) {
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <main>
      <AuthScreenBackdrop>
        <div className="auth-glass-card motion-card flex w-full max-w-sm flex-col items-center gap-6 rounded-[2.4rem] p-8 text-center backdrop-blur-2xl backdrop-saturate-150 sm:p-10">
          <Sprig />
          <div>
            <p className="muted text-forest-800">Welcome back</p>
            <h1 className="mt-3 font-display text-2xl uppercase tracking-wide text-forest-900 sm:text-3xl">
              Sign In
            </h1>
            <p className="mt-4 text-base leading-7 text-forest-700">
              Enter your email and we&rsquo;ll send you a one-time link, no password needed.
            </p>
          </div>

          {status === "sent" ? (
            <p className="text-base leading-7 text-forest-700">
              Check your inbox. We sent a sign-in link to <strong>{email}</strong>. It expires in 24 hours and can
              only be used once.
            </p>
          ) : (
            <div className="w-full space-y-5">
              <button
                type="button"
                onClick={() => signIn("google-customer", {callbackUrl: "/"})}
                className="glass-btn-secondary flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-base font-semibold text-forest-900"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <div className="flex items-center gap-3 text-sm text-forest-700">
                <span className="h-px flex-1 bg-[#d4c5ab]" />
                or
                <span className="h-px flex-1 bg-[#d4c5ab]" />
              </div>

              <form onSubmit={handleSubmit} className="w-full space-y-3">
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-full border border-[#d4c5ab] bg-white/80 px-6 py-3.5 text-base text-forest-900 outline-none focus:border-forest-400"
                />
                {status === "error" ? (
                  <p className="text-center text-sm text-red-600">Something went wrong sending your link. Please try again.</p>
                ) : null}
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="glass-btn-primary w-full rounded-full px-6 py-3.5 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "submitting" ? "Sending link..." : "Send sign-in link"}
                </button>
              </form>
            </div>
          )}
        </div>
      </AuthScreenBackdrop>
    </main>
  );
}
