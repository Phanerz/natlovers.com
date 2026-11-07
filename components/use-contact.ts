"use client";

import {useEffect, useState} from "react";
import {DEFAULT_CONTACT, type ContactSettings} from "@/lib/studio-contact";

// The studio's contact details as set in the admin panel. Shows the defaults at once and swaps in
// the saved values a moment later; one request is shared by everything on the page.
let cached: ContactSettings | null = null;
let pending: Promise<ContactSettings> | null = null;

function load(): Promise<ContactSettings> {
  if (cached) return Promise.resolve(cached);
  pending ??= fetch("/api/site-content/contact", {cache: "no-store"})
    .then((response) => (response.ok ? (response.json() as Promise<ContactSettings>) : DEFAULT_CONTACT))
    .catch(() => DEFAULT_CONTACT)
    .then((data) => {
      cached = data;
      pending = null;
      return data;
    });
  return pending;
}

export function useContact(): ContactSettings {
  const [contact, setContact] = useState<ContactSettings>(cached ?? DEFAULT_CONTACT);
  useEffect(() => {
    let off = false;
    void load().then((data) => {
      if (!off) setContact(data);
    });
    return () => {
      off = true;
    };
  }, []);
  return contact;
}
