"use client";

import {FormEvent, Suspense, useEffect, useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useRouter, useSearchParams} from "next/navigation";
import {signOut, useSession} from "next-auth/react";
import {CircleHelp, CreditCard, Heart, LogOut, Mail, MessageCircle, Package, Settings, User} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {CurrencyCode, Locale, currencies, currencySymbols, locales} from "@/lib/site";

type TabKey = "profile" | "orders" | "wishlist" | "payment" | "settings" | "help";

const tabs: {key: TabKey; label: string; icon: typeof User}[] = [
  {key: "profile", label: "Profile information", icon: User},
  {key: "orders", label: "Orders & purchases", icon: Package},
  {key: "wishlist", label: "Wishlist", icon: Heart},
  {key: "payment", label: "Payment methods", icon: CreditCard},
  {key: "settings", label: "Account settings", icon: Settings},
  {key: "help", label: "Help & support", icon: CircleHelp}
];

function tabFromParam(value: string | null): TabKey {
  return tabs.some((item) => item.key === value) ? (value as TabKey) : "profile";
}

type ProfileForm = {name: string; phone: string; bio: string};

function EmptyState({title, body}: {title: string; body: string}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <h2 className="font-display text-2xl text-forest-900">{title}</h2>
      <p className="max-w-sm text-sm leading-6 text-forest-600">{body}</p>
    </div>
  );
}

function AccountContent() {
  const {data: session, status} = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {locale, currency, setLocale, setCurrency} = useSitePreferences();

  const tab = tabFromParam(searchParams.get("tab"));
  const [form, setForm] = useState<ProfileForm>({name: "", phone: "", bio: ""});
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    let cancelled = false;
    fetch("/api/account", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {name: string | null; phone: string | null; bio: string | null} | null) => {
        if (!cancelled && data) {
          setForm({name: data.name ?? "", phone: data.phone ?? "", bio: data.bio ?? ""});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProfileLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  function selectTab(key: TabKey) {
    router.replace(key === "profile" ? "/account" : `/account?tab=${key}`, {scroll: false});
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(form)
      });
      if (response.ok) {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading" || (status === "authenticated" && !profileLoaded)) {
    return (
      <main className="shell flex min-h-[70vh] items-center justify-center py-16">
        <p className="muted">Loading...</p>
      </main>
    );
  }

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <main className="shell py-10 sm:py-14">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-forest-500">Account</p>
        <h1 className="mt-2 font-display text-4xl text-forest-900">My Profile</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="rounded-[1.75rem] border border-[#e4d9c1] bg-white/60 p-3 backdrop-blur-xl lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center gap-3 px-3 py-3">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-forest-900">
              {user.image ? (
                <Image src={user.image} alt="" fill sizes="44px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase text-sand-50">
                  {(user.name ?? user.email ?? "?").charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-forest-900">{user.name ?? "Natlovers collector"}</p>
              <p className="truncate text-xs text-forest-500">{user.email}</p>
            </div>
          </div>

          <div className="my-1 h-px bg-[#e4d9c1]" />

          <nav className="py-1">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = item.key === tab;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                    active ? "bg-forest-900 text-sand-50" : "text-forest-700 hover:bg-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-sand-50" : "text-forest-500"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="my-1 h-px bg-[#e4d9c1]" />

          <button
            type="button"
            onClick={() => signOut({callbackUrl: "/signed-out"})}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#a4402b] transition-colors duration-150 hover:bg-[#f7e9e2]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <div className="rounded-[1.75rem] border border-[#e4d9c1] bg-white/60 p-6 backdrop-blur-xl sm:p-8">
          {tab === "profile" ? (
            <form onSubmit={handleSave} className="space-y-8">
              <div>
                <h2 className="font-display text-2xl text-forest-900">Profile information</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm text-forest-700">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Full name</span>
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({...current, name: event.target.value}))}
                      className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm text-forest-700">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Email address</span>
                    <input
                      value={user.email ?? ""}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-[#e4d9c1] bg-[#f3ede0] px-4 py-3 text-forest-500"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm text-forest-700">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Phone number</span>
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({...current, phone: event.target.value}))}
                      placeholder="+62"
                      className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-1.5 text-sm text-forest-700">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Bio (optional)</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => setForm((current) => ({...current, bio: event.target.value}))}
                    rows={3}
                    placeholder="Lover of natural craft, sustainable living, and meaningful stories."
                    className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                  />
                </label>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="button-lift rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  {saved ? <span className="text-sm text-forest-600">Saved.</span> : null}
                </div>
              </div>
            </form>
          ) : null}

          {tab === "orders" ? (
            <EmptyState
              title="Orders & purchases"
              body="No orders yet. Pieces you buy through bank-transfer checkout will show up here."
            />
          ) : null}

          {tab === "wishlist" ? (
            <EmptyState
              title="Wishlist"
              body="Your wishlist is empty. Tap the heart on a piece in the catalogue to save it here."
            />
          ) : null}

          {tab === "payment" ? (
            <EmptyState
              title="Payment methods"
              body="Natlovers doesn't store payment details — every order is confirmed by bank transfer directly with the studio."
            />
          ) : null}

          {tab === "settings" ? (
            <div>
              <h2 className="font-display text-2xl text-forest-900">Account settings</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-forest-600">
                Sign-in is passwordless — a one-time link is emailed to you, so there&rsquo;s no password to manage.
                Set your preferred language and currency below; they apply across the whole site.
              </p>
              <div className="mt-5 grid gap-4 sm:max-w-md sm:grid-cols-2">
                <label className="space-y-1.5 text-sm text-forest-700">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Language</span>
                  <select
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                    className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                  >
                    {locales.map((option) => (
                      <option key={option} value={option}>
                        {option === "en" ? "English" : "Bahasa"}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm text-forest-700">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Currency</span>
                  <select
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                    className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                  >
                    {currencies.map((option) => (
                      <option key={option} value={option}>
                        {option} — {currencySymbols[option].trim()}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          {tab === "help" ? (
            <div>
              <h2 className="font-display text-2xl text-forest-900">Help & support</h2>
              <div className="mt-5 space-y-3 text-sm text-forest-700">
                <Link href="mailto:natlovers@gmail.com" className="flex items-center gap-2 hover:text-forest-900">
                  <Mail className="h-4 w-4" /> natlovers@gmail.com
                </Link>
                <Link href="https://wa.me/628122697007" className="flex items-center gap-2 hover:text-forest-900">
                  <MessageCircle className="h-4 w-4" /> Anita Yan: +62 812-2697-007
                </Link>
                <Link href="https://wa.me/6281125001888" className="flex items-center gap-2 hover:text-forest-900">
                  <MessageCircle className="h-4 w-4" /> Phanuel: +62 811-2500-1888
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="shell flex min-h-[70vh] items-center justify-center py-16">
          <p className="muted">Loading...</p>
        </main>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
