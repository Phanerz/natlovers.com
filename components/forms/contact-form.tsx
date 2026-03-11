"use client";

import {useState} from "react";
import {Locale} from "@/lib/site";
import {getDictionary} from "@/lib/translations";

export function ContactForm({locale}: {locale: Locale}) {
  const dict = getDictionary(locale);
  const [status, setStatus] = useState<string>("");

  async function handleSubmit(formData: FormData) {
    const response = await fetch("/api/contact", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(formData.entries()))
    });

    setStatus(response.ok ? "Sent successfully." : "Please try again.");
  }

  return (
    <form action={handleSubmit} className="card space-y-4 p-6">
      <input name="name" placeholder="Name" className="w-full rounded-2xl border border-forest-100 px-4 py-3 outline-none" />
      <input name="email" placeholder="Email" className="w-full rounded-2xl border border-forest-100 px-4 py-3 outline-none" />
      <input name="subject" placeholder="Subject" className="w-full rounded-2xl border border-forest-100 px-4 py-3 outline-none" />
      <textarea
        name="message"
        placeholder="Message"
        className="min-h-36 w-full rounded-2xl border border-forest-100 px-4 py-3 outline-none"
      />
      <button className="rounded-full bg-forest-900 px-5 py-3 text-sm text-sand-50">{dict.common.submit}</button>
      {status ? <p className="text-sm text-forest-600">{status}</p> : null}
    </form>
  );
}
