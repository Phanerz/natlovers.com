"use client";

import {FormEvent, useState} from "react";
import {signIn} from "next-auth/react";
import {AuthScreenBackdrop} from "@/components/auth-screen-backdrop";

type Status = "idle" | "submitting" | "sent" | "error";

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
                className="button-lift w-full rounded-full bg-forest-900 px-6 py-3.5 text-base font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "submitting" ? "Sending link..." : "Send sign-in link"}
              </button>
            </form>
          )}
        </div>
      </AuthScreenBackdrop>
    </main>
  );
}
