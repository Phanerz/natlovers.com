"use client";

import {useEffect, useState} from "react";
import {Mail, MessageCircle} from "lucide-react";
import {DEFAULT_CONTACT, whatsappLink, type ContactSettings} from "@/lib/studio-contact";

const fieldClass =
  "w-full rounded-lg border border-[#d4c5ab] bg-[#fffdf9] px-4 py-3 text-base text-forest-900 outline-none focus:border-forest-400";

// The email and the two WhatsApp numbers customers see in the footer, their account's help page and
// the policy pages. Change them here when someone new looks after the shop.
export function ManageContactPanel() {
  const [contact, setContact] = useState<ContactSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: "ok" | "error"; text: string} | null>(null);

  useEffect(() => {
    let off = false;
    fetch("/api/site-content/contact", {cache: "no-store"})
      .then((response) => response.json())
      .then((data: ContactSettings) => {
        if (!off) setContact(data);
      })
      .catch(() => {
        if (!off) setMessage({type: "error", text: "Could not load the contact details."});
      });
    return () => {
      off = true;
    };
  }, []);

  if (!contact) {
    return <div className="card p-8 text-sm text-forest-600">{message ? message.text : "Loading..."}</div>;
  }

  function setWhatsApp(index: 0 | 1, patch: Partial<ContactSettings["whatsapp"][0]>) {
    setContact((current) => {
      if (!current) return current;
      const next: ContactSettings["whatsapp"] = [{...current.whatsapp[0]}, {...current.whatsapp[1]}];
      next[index] = {...next[index], ...patch};
      return {...current, whatsapp: next};
    });
  }

  async function save() {
    if (!contact) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/site-content/contact", {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(contact)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Could not save the contact details.");
      setContact(data as ContactSettings);
      setMessage({type: "ok", text: "Saved. The footer, account help page and policy pages show it straight away."});
    } catch (caught) {
      setMessage({type: "error", text: caught instanceof Error ? caught.message : "Could not save the contact details."});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="card space-y-5 p-6 sm:p-8">
        <div>
          <h2 className="font-display text-2xl text-forest-900">Contact details</h2>
          <p className="mt-1 text-sm text-forest-600">
            Shown in the footer, on the account help page and on the Terms, Returns &amp; Shipping and Privacy pages. Include the country code on WhatsApp numbers.
          </p>
        </div>

        <label className="block space-y-2 text-sm text-forest-700">
          <span className="muted">Email</span>
          <input
            type="email"
            value={contact.email}
            onChange={(event) => setContact({...contact, email: event.target.value})}
            maxLength={120}
            className={fieldClass}
          />
        </label>

        {([0, 1] as const).map((index) => (
          <div key={index} className="grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]">
            <label className="block space-y-2 text-sm text-forest-700">
              <span className="muted">WhatsApp {index + 1}: name</span>
              <input
                value={contact.whatsapp[index].name}
                onChange={(event) => setWhatsApp(index, {name: event.target.value})}
                maxLength={40}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-2 text-sm text-forest-700">
              <span className="muted">WhatsApp {index + 1}: number</span>
              <input
                value={contact.whatsapp[index].number}
                onChange={(event) => setWhatsApp(index, {number: event.target.value})}
                maxLength={30}
                inputMode="tel"
                placeholder="+62 812-0000-0000"
                className={fieldClass}
              />
            </label>
          </div>
        ))}

        {message ? <p className={`text-sm ${message.type === "ok" ? "text-forest-700" : "text-red-600"}`}>{message.text}</p> : null}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="glass-btn-primary rounded-full px-7 py-3 text-sm font-semibold text-sand-50 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save contact details"}
          </button>
          <button type="button" onClick={() => setContact(DEFAULT_CONTACT)} className="text-sm font-medium text-forest-700 underline">
            Fill in the original details
          </button>
        </div>
      </div>

      <div className="card h-fit space-y-3 p-6 text-sm text-forest-700">
        <p className="muted">Preview</p>
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4" /> {contact.email}
        </p>
        {contact.whatsapp.map((entry, index) => (
          <p key={index} className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <a href={whatsappLink(entry.number)} className="hover:text-forest-900">
              {entry.name}: {entry.number}
            </a>
          </p>
        ))}
      </div>
    </div>
  );
}
