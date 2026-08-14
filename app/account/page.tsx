"use client";

import {FormEvent, Suspense, useEffect, useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {useRouter, useSearchParams} from "next/navigation";
import {signOut, useSession} from "next-auth/react";
import {
  CircleHelp,
  CreditCard,
  Download,
  Heart,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Repeat,
  Settings,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users
} from "lucide-react";
import {AddressesManager} from "@/components/addresses-manager";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {formatCurrency} from "@/lib/format";
import type {CustomerTelemetry} from "@/lib/customers";
import {orderStatusLabels} from "@/lib/order-status";
import {CurrencyCode, Locale, currencies, currencySymbols, locales} from "@/lib/site";
import type {AdminProduct} from "@/lib/admin-products";
import type {OrderView} from "@/lib/orders";

type TabKey = "profile" | "orders" | "addresses" | "wishlist" | "payment" | "settings" | "help";

const tabs: {key: TabKey; label: string; icon: typeof User}[] = [
  {key: "profile", label: "Profile information", icon: User},
  {key: "orders", label: "Orders & purchases", icon: Package},
  {key: "addresses", label: "Addresses", icon: MapPin},
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

function toWhatsAppLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  const withCountryCode = withoutLeadingZero.startsWith("62") ? withoutLeadingZero : `62${withoutLeadingZero}`;
  return `https://wa.me/${withCountryCode}`;
}

// Same real query the Customers CRM page uses (lib/customers.ts) — this is
// only ever rendered when the API has already confirmed the viewer is an
// admin (see the isAdmin check in app/api/account/route.ts), so a regular
// customer's own profile never requests or sees business-wide numbers.
function AdminTelemetryRow({telemetry}: {telemetry: CustomerTelemetry}) {
  const cards: {icon: typeof Users; label: string; value: string; subtext: string}[] = [
    {icon: Users, label: "Total Customers", value: String(telemetry.totalCustomers), subtext: `+${telemetry.newThisMonth} this month`},
    {icon: UserPlus, label: "New Customers", value: String(telemetry.newThisMonth), subtext: "This calendar month"},
    {icon: UserCheck, label: "Returning Customers", value: String(telemetry.returningCustomers), subtext: "Ordered 2+ times"},
    {icon: Repeat, label: "Repeat Purchase Rate", value: `${telemetry.repeatPurchaseRate}%`, subtext: "Customers who returned"}
  ];

  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-forest-500">Admin overview</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[1.4rem] border border-[#e4d9c1] bg-white/70 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-forest-500">{card.label}</p>
            <p className="mt-1 font-display text-2xl text-forest-900">{card.value}</p>
            <p className="mt-1 text-xs text-forest-500">{card.subtext}</p>
          </div>
        ))}
      </div>
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
  const [orders, setOrders] = useState<OrderView[] | null>(null);
  const [wishlistProducts, setWishlistProducts] = useState<AdminProduct[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTelemetry, setAdminTelemetry] = useState<CustomerTelemetry | null>(null);

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
      .then(
        (
          data: {
            name: string | null;
            phone: string | null;
            bio: string | null;
            isAdmin?: boolean;
            adminTelemetry?: CustomerTelemetry | null;
          } | null
        ) => {
          if (!cancelled && data) {
            setForm({name: data.name ?? "", phone: data.phone ?? "", bio: data.bio ?? ""});
            setIsAdmin(Boolean(data.isAdmin));
            setAdminTelemetry(data.adminTelemetry ?? null);
          }
        }
      )
      .finally(() => {
        if (!cancelled) {
          setProfileLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated" || (tab !== "orders" && tab !== "profile") || orders !== null) {
      return;
    }
    let cancelled = false;
    fetch("/api/orders", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : {orders: []}))
      .then((data: {orders: OrderView[]}) => {
        if (!cancelled) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrders([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, tab, orders]);

  useEffect(() => {
    if (status !== "authenticated" || tab !== "wishlist" || wishlistProducts !== null) {
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch("/api/wishlist", {cache: "no-store"}).then((response) => (response.ok ? response.json() : {slugs: []})),
      fetch("/api/admin/products", {cache: "no-store"}).then((response) => (response.ok ? response.json() : []))
    ])
      .then(([wishlist, allProducts]: [{slugs: string[]}, AdminProduct[]]) => {
        if (cancelled) {
          return;
        }
        const slugs = new Set(Array.isArray(wishlist.slugs) ? wishlist.slugs : []);
        setWishlistProducts(Array.isArray(allProducts) ? allProducts.filter((product) => slugs.has(product.slug)) : []);
      })
      .catch(() => {
        if (!cancelled) {
          setWishlistProducts([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status, tab, wishlistProducts]);

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
            <div className="space-y-8">
              {isAdmin && adminTelemetry ? <AdminTelemetryRow telemetry={adminTelemetry} /> : null}

              <div className="grid gap-8 lg:grid-cols-2">
                <form onSubmit={handleSave} className="space-y-5">
                  <h2 className="font-display text-2xl text-forest-900">Profile information</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
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
                    <label className="space-y-1.5 text-sm text-forest-700 sm:col-span-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Phone number</span>
                      <input
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({...current, phone: event.target.value}))}
                        placeholder="+62"
                        className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                      />
                      {form.phone.trim() ? (
                        <a
                          href={toWhatsAppLink(form.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-[#2f5b2b] hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Click to chat via WhatsApp
                        </a>
                      ) : null}
                    </label>
                    <label className="space-y-1.5 text-sm text-forest-700 sm:col-span-2">
                      <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Preferred language</span>
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
                  </div>
                  <label className="block space-y-1.5 text-sm text-forest-700">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-forest-500">Bio (optional)</span>
                    <textarea
                      value={form.bio}
                      onChange={(event) => setForm((current) => ({...current, bio: event.target.value}))}
                      rows={3}
                      placeholder="Lover of natural craft, sustainable living, and meaningful stories."
                      className="w-full rounded-xl border border-[#e4d9c1] bg-white px-4 py-3 text-forest-900 outline-none focus:border-forest-400"
                    />
                  </label>

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="button-lift rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    {saved ? <span className="text-sm text-forest-600">Saved.</span> : null}
                  </div>
                </form>

                <div className="space-y-8">
                  <AddressesManager />

                  <div>
                    <h2 className="font-display text-2xl text-forest-900">Account</h2>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#e4d9c1] bg-white/70 p-4">
                        <span className="flex items-center gap-3 text-sm text-forest-700">
                          <Download className="h-4 w-4 text-forest-500" />
                          Export my data
                        </span>
                        <Link href="/account?tab=help" className="text-xs font-medium text-forest-700 underline decoration-dotted underline-offset-2 hover:text-forest-900">
                          Request via support
                        </Link>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#f3d9d0] bg-[#faf1ed] p-4">
                        <span className="flex items-center gap-3 text-sm text-[#a4402b]">
                          <Trash2 className="h-4 w-4" />
                          Delete account
                        </span>
                        <Link href="/account?tab=help" className="text-xs font-medium text-[#a4402b] underline decoration-dotted underline-offset-2 hover:text-[#7a2f1e]">
                          Request via support
                        </Link>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-forest-500">
                      Self-service data export and account deletion aren&rsquo;t built yet — reach out and we&rsquo;ll handle it directly.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-2xl text-forest-900">Recent orders</h2>
                  <button
                    type="button"
                    onClick={() => selectTab("orders")}
                    className="text-sm font-medium text-forest-700 hover:text-forest-900"
                  >
                    View all orders
                  </button>
                </div>
                {orders === null ? (
                  <p className="py-8 text-center text-sm text-forest-500">Loading...</p>
                ) : orders.length === 0 ? (
                  <p className="py-8 text-center text-sm text-forest-500">No orders yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#e4d9c1] bg-white/70 px-4 py-3">
                        <div>
                          <p className="font-display text-base text-forest-900">{order.orderRef}</p>
                          <p className="text-xs text-forest-500">{new Date(order.createdAt).toLocaleDateString(undefined, {dateStyle: "medium"})}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-forest-700">{formatCurrency(order.totalIdr, currency)}</span>
                          <span className="rounded-full border border-[#e4d9c1] bg-[#eee4cd] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-forest-700">
                            {orderStatusLabels[order.status] ?? order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === "orders" ? (
            orders === null ? (
              <p className="py-16 text-center text-sm text-forest-500">Loading...</p>
            ) : orders.length === 0 ? (
              <EmptyState
                title="Orders & purchases"
                body="No orders yet. Pieces you buy through bank-transfer checkout will show up here."
              />
            ) : (
              <div className="space-y-4">
                <h2 className="font-display text-2xl text-forest-900">Orders & purchases</h2>
                {orders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-[#e4d9c1] bg-white/70 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-display text-lg text-forest-900">{order.orderRef}</p>
                      <span className="rounded-full border border-[#e4d9c1] bg-[#eee4cd] px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-forest-700">
                        {orderStatusLabels[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-forest-500">
                      {new Date(order.createdAt).toLocaleDateString(undefined, {dateStyle: "medium"})}
                    </p>
                    <div className="mt-3 space-y-1.5 border-t border-[#e4d9c1] pt-3">
                      {order.items.map((item) => (
                        <div key={item.slug} className="flex items-center justify-between text-sm text-forest-700">
                          <span>
                            {item.name} <span className="text-forest-500">&times;{item.quantity}</span>
                          </span>
                          <span>{formatCurrency(item.priceIdr * item.quantity, currency)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[#e4d9c1] pt-3 text-sm font-semibold text-forest-900">
                      <span>Total</span>
                      <span>{formatCurrency(order.totalIdr, currency)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}

          {tab === "addresses" ? <AddressesManager /> : null}

          {tab === "wishlist" ? (
            wishlistProducts === null ? (
              <p className="py-16 text-center text-sm text-forest-500">Loading...</p>
            ) : wishlistProducts.length === 0 ? (
              <EmptyState
                title="Wishlist"
                body="Your wishlist is empty. Tap the heart on a piece in the catalogue to save it here."
              />
            ) : (
              <div>
                <h2 className="font-display text-2xl text-forest-900">Wishlist</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {wishlistProducts.map((product) => (
                    <Link
                      key={product.slug}
                      href={`/catalogue/${product.slug}`}
                      className="flex items-center gap-3 rounded-2xl border border-[#e4d9c1] bg-white/70 p-3 transition-colors duration-150 hover:bg-white"
                    >
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#eee4cd]">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-base text-forest-900">{product.name}</p>
                        <p className="text-sm text-forest-600">{formatCurrency(product.priceIdr, currency)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          ) : null}

          {tab === "payment" ? (
            <EmptyState
              title="Payment methods"
              body="Natlovers doesn't store payment details. Every order is confirmed by bank transfer directly with the studio."
            />
          ) : null}

          {tab === "settings" ? (
            <div>
              <h2 className="font-display text-2xl text-forest-900">Account settings</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-forest-600">
                Sign-in is passwordless. A one-time link is emailed to you, so there&rsquo;s no password to manage.
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
                        {option} ({currencySymbols[option].trim()})
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
