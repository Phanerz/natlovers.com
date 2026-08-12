"use client";

import {FormEvent, useState} from "react";
import {signIn} from "next-auth/react";
import {AuthScreenBackdrop} from "@/components/auth-screen-backdrop";

type Status = "idle" | "submitting" | "sent" | "error";

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
        <div className="auth-glass-card motion-card flex aspect-square w-full max-w-sm flex-col justify-center gap-6 rounded-[2.4rem] p-8 backdrop-blur-2xl backdrop-saturate-150 sm:p-10">
          <div className="text-center">
            <p className="muted text-forest-800">Account Access</p>
            <h1 className="mt-3 font-display text-2xl uppercase tracking-wide text-forest-900 sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-4 text-base leading-7 text-forest-700">
              Sign in to your Natlovers account with a one-time email link.
            </p>
          </div>

          {status === "sent" ? (
            <p className="text-center text-base leading-7 text-forest-700">
              Check your inbox. We sent a sign-in link to <strong>{email}</strong>. It expires in 24 hours and can
              only be used once.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                name="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-full border border-[#d4c5ab] bg-white px-6 py-3.5 text-base text-forest-900 outline-none"
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
