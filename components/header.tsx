"use client";

import Image from "next/image";
import type {Route} from "next";
import Link from "next/link";
import {useMemo, useState} from "react";
import {
  ChevronDown,
  ExternalLink,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X
} from "lucide-react";
import {formatCurrency} from "@/lib/format";
import {currencies, locales} from "@/lib/site";
import {getDictionary} from "@/lib/translations";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";

export function Header() {
  const {locale, currency, setLocale, setCurrency} = useSitePreferences();
  const {
    cartItems,
    cabinetOpen,
    previewSlug,
    checkoutDraft,
    getProducts,
    resolveProduct,
    openCabinet,
    closeCabinet,
    openPreview,
    closePreview,
    removeFromCart,
    updateQuantity,
    startBankTransferForCart,
    clearCheckoutDraft,
    getCartSubtotalIdr
  } = useStorefront();

  const [query, setQuery] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<null | {
    orderRef: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    total: number;
  }>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const dict = getDictionary(locale);
  const navItems: Array<{href: Route; label: string}> = [
    {href: "/", label: dict.nav.home},
    {href: "/about", label: dict.nav.about},
    {href: "/catalogue", label: dict.nav.catalogue},
    {href: "/custom", label: dict.nav.custom},
    {href: "/gallery", label: dict.nav.gallery},
    {href: "/contact", label: dict.nav.contact},
    {href: "/social-medias", label: locale === "en" ? "Socials" : "Sosial"},
    {href: "/dashboard", label: dict.nav.dashboard},
    {href: "/admin", label: dict.nav.admin}
  ];

  const products = getProducts(locale);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return products;
    }

    return products.filter((product) => {
      return [product.title, product.description, product.story, ...product.materials]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [products, query]);

  const cartProducts = cartItems
    .map((item) => {
      const product = resolveProduct(item.slug, locale);
      return product ? {...product, quantity: item.quantity} : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const subtotalIdr = getCartSubtotalIdr(locale);
  const previewProduct = previewSlug ? resolveProduct(previewSlug, locale) : undefined;
  const checkoutProducts =
    checkoutDraft?.items
      .map((item) => {
        const product = resolveProduct(item.slug, locale);
        return product ? {...product, quantity: item.quantity} : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null) ?? [];
  const checkoutTotalIdr = checkoutProducts.reduce(
    (sum, item) => sum + item.priceIdr * item.quantity,
    0
  );

  async function confirmBankTransfer() {
    if (!checkoutProducts.length) {
      return;
    }

    setCheckoutLoading(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          method: "bank_transfer",
          items: checkoutProducts.map((item) => ({slug: item.slug, quantity: item.quantity})),
          total: checkoutTotalIdr
        })
      });

      const payload = await response.json();
      setCheckoutState(payload);
    } finally {
      setCheckoutLoading(false);
    }
  }

  function closeAllCabinetViews() {
    clearCheckoutDraft();
    closePreview();
    setCheckoutState(null);
  }

  return (
    <>
      <header className="sticky top-0 z-40 min-h-[var(--header-height)] border-b border-[#efe3cb]/12 bg-[linear-gradient(180deg,rgba(8,18,13,0.98),rgba(8,18,13,0.94))] text-sand-50 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
        <div className="shell flex min-h-[var(--header-height)] items-center justify-between gap-4 py-3">
          <Link
            href="/"
            aria-label="Go to Natlovers homepage"
            className="button-lift flex items-center rounded-[1.55rem] border border-[#fff1cf]/22 bg-[#f2e7d0] px-3 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.24)]"
          >
            <Image
              src="/natlovers-logo.avif"
              alt="Natlovers logo"
              width={220}
              height={62}
              className="h-auto w-[180px] object-contain sm:w-[220px]"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-2 rounded-full border border-[#f2e7cf]/26 bg-[#081c13]/94 px-3 py-2 shadow-[0_18px_36px_rgba(0,0,0,0.28)] backdrop-blur-xl lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link header-text-shadow whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium tracking-[0.08em] text-[#fff7e5]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-sand-50">
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setSelectorOpen((open) => !open)}
                className="control-pill header-text-shadow inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full border border-[#fff1cf]/20 bg-[#f2e7d0] px-4 py-2 text-sm font-semibold text-forest-900 shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
              >
                <span>{locale.toUpperCase()} / {currency}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {selectorOpen ? (
                <div className="menu-surface absolute right-0 top-14 z-50 w-[19rem] rounded-[1.7rem] border border-[#d8ccb6] bg-[#f8f1e6] p-5 text-forest-900 shadow-[0_24px_60px_rgba(28,25,18,0.24)]">
                  <div className="rounded-[1.2rem] border border-[#ddd0b9] bg-[#fffaf1] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <p className="muted">{dict.common.locale}</p>
                    <div className="mt-3 flex gap-2">
                      {locales.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setLocale(option);
                            setSelectorOpen(false);
                          }}
                          className={`control-pill rounded-full border px-4 py-2 text-sm font-medium ${
                            locale === option
                              ? "border-[#183124] bg-[#12281b] text-[#fff8eb] shadow-[0_10px_22px_rgba(18,40,27,0.24)]"
                              : "border-[#d9ccb3] bg-[#fffdf8] text-forest-700 shadow-[0_6px_16px_rgba(79,58,28,0.08)]"
                          }`}
                        >
                          {option === "en" ? "English" : "Bahasa"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-[1.2rem] border border-[#ddd0b9] bg-[#fffaf1] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <p className="muted">{dict.common.currency}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {currencies.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setCurrency(option);
                            setSelectorOpen(false);
                          }}
                          className={`control-pill rounded-full border px-3 py-2 text-sm font-medium ${
                            currency === option
                              ? "border-[#baa066] bg-[#f4e2b6] text-forest-900 shadow-[0_10px_22px_rgba(146,111,47,0.18)]"
                              : "border-[#d9ccb3] bg-[#fffdf8] text-forest-700 shadow-[0_6px_16px_rgba(79,58,28,0.08)]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="icon-button header-text-shadow rounded-full border border-[#fff1cf]/20 bg-[#f2e7d0] p-2 text-forest-900 shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Cart"
              onClick={openCabinet}
              className="icon-button header-text-shadow relative rounded-full border border-[#fff1cf]/20 bg-[#f2e7d0] p-2 text-forest-900 shadow-[0_12px_28px_rgba(0,0,0,0.22)]"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartItems.length ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-900 px-1 text-[10px] font-semibold text-sand-50">
                  {cartItems.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
              className="icon-button header-text-shadow rounded-full border border-[#fff1cf]/20 bg-[#f2e7d0] p-2 text-forest-900 shadow-[0_12px_28px_rgba(0,0,0,0.22)] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {searchOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(7,18,12,0.42)] p-4 backdrop-blur-lg">
          <div className="menu-surface mx-auto mt-12 max-w-5xl rounded-[2.2rem] border border-[#d7cab2] bg-[rgba(247,240,227,0.94)] p-6 text-forest-900 shadow-[0_30px_90px_rgba(18,20,14,0.28)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="muted">Search</p>
                <h2 className="mt-2 font-display text-3xl text-forest-900">
                  Find a Natlovers piece
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="icon-button rounded-full border border-[#d7cab2] bg-[#fffdf8] p-3 text-forest-900 shadow-[0_8px_22px_rgba(59,43,22,0.12)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search motif, material, or story"
              className="mt-6 w-full rounded-full border border-[#d4c5ab] bg-[#fffdf9] px-6 py-4 text-forest-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_10px_28px_rgba(80,60,30,0.08)] placeholder:text-forest-500 outline-none"
            />
            <div className="mt-6 grid gap-4">
              {results.map((product) => (
                <div
                  key={product.slug}
                  className="motion-card rounded-[1.6rem] border border-[#d2c3a8] bg-[rgba(255,252,246,0.96)] p-5 shadow-[0_14px_32px_rgba(74,54,27,0.08)] hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          openPreview(product.slug);
                          setSearchOpen(false);
                        }}
                        className="text-left font-display text-2xl text-forest-900 hover:text-forest-700"
                      >
                        {product.title}
                      </button>
                      <p className="mt-2 text-sm leading-7 text-forest-700">
                        {product.description}
                      </p>
                    </div>
                    <p className="rounded-full border border-[#d7cab2] bg-[#fff8ea] px-4 py-2 text-sm font-semibold text-forest-900 shadow-[0_6px_16px_rgba(80,60,30,0.08)]">
                      {formatCurrency(product.priceIdr, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {cabinetOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(7,18,12,0.36)] backdrop-blur-lg">
          <div className="ml-auto flex h-full w-full max-w-[33rem] flex-col border-l border-[#d7cab2] bg-[rgba(247,240,227,0.97)] p-6 shadow-[0_28px_90px_rgba(18,20,14,0.32)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="muted">Collector Cabinet</p>
                <h2 className="mt-2 font-display text-3xl text-forest-900">
                  Your collection bag
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  closeCabinet();
                  closeAllCabinetViews();
                }}
                className="icon-button rounded-full border border-[#d7cab2] bg-[#fffdf8] p-3 text-forest-900 shadow-[0_8px_22px_rgba(59,43,22,0.12)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-[1.4rem] border border-[#d2c3a8] bg-[#fffaf1] px-4 py-4 text-sm text-forest-700 shadow-[0_12px_30px_rgba(79,58,28,0.08)]">
              <span>Bag, preview, and bank-transfer checkout are live now.</span>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 font-medium text-forest-900 hover:text-forest-700"
              >
                Studio Control <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            {previewProduct ? (
              <div className="mt-5 rounded-[1.6rem] border border-[#d2c3a8] bg-[#fffaf2] p-4 shadow-[0_14px_34px_rgba(79,58,28,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="muted">Preview</p>
                  <button
                    type="button"
                    onClick={closePreview}
                    className="text-sm font-medium text-forest-700 hover:text-forest-900"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-3 overflow-hidden rounded-[1.3rem] border border-[#d2c3a8] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                  <div
                    className="aspect-[4/3] w-full bg-cover bg-center"
                    style={{backgroundImage: `url(${previewProduct.imageUrl})`}}
                  />
                </div>
                <p className="mt-4 font-display text-2xl text-forest-900">
                  {previewProduct.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-forest-700">
                  {previewProduct.story}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewProduct.materials.map((material) => (
                    <span
                      key={material}
                      className="rounded-full border border-[#d5c8b1] bg-[#fffdf8] px-3 py-1 text-xs text-forest-700"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {checkoutDraft ? (
              <div className="mt-5 rounded-[1.6rem] border border-[#32503b] bg-[#102418] p-5 text-sand-50 shadow-[0_18px_44px_rgba(9,20,13,0.28)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-sand-200/80">
                      Bank transfer checkout
                    </p>
                    <p className="mt-2 font-display text-2xl">Review your transfer</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearCheckoutDraft();
                      setCheckoutState(null);
                    }}
                    className="text-sm font-medium text-sand-100/85 hover:text-sand-50"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-4 space-y-3 text-sm text-sand-100/90">
                  {checkoutProducts.map((item) => (
                    <div
                      key={item.slug}
                      className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/18 bg-white/8 px-3 py-3"
                    >
                      <div>
                        <p className="font-medium text-sand-50">{item.title}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-sand-100/68">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <span>{formatCurrency(item.priceIdr * item.quantity, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-sand-50">
                  <span>Total</span>
                  <span>{formatCurrency(checkoutTotalIdr, currency)}</span>
                </div>
                <button
                  type="button"
                  onClick={confirmBankTransfer}
                  disabled={checkoutLoading}
                  className="button-lift mt-4 w-full rounded-full bg-sand-100 px-5 py-3 text-sm font-semibold text-forest-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {checkoutLoading
                    ? "Preparing transfer details..."
                    : "Generate bank transfer instructions"}
                </button>
                {checkoutState ? (
                  <div className="mt-4 rounded-[1.2rem] border border-white/16 bg-white/10 p-4 text-sm leading-7 text-sand-50/94">
                    <p className="font-medium">Order ref: {checkoutState.orderRef}</p>
                    <p className="mt-2">Bank: {checkoutState.bankName}</p>
                    <p>Account name: {checkoutState.accountName}</p>
                    <p>Account number: {checkoutState.accountNumber}</p>
                    <p>
                      Transfer total: {formatCurrency(checkoutState.total, currency)}
                    </p>
                    <p className="mt-2 text-sand-100/78">
                      Use this reference when sending payment confirmation to WhatsApp.
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex-1 overflow-y-auto pr-1">
              {cartProducts.length ? (
                <div className="space-y-4">
                  {cartProducts.map((item) => (
                    <div
                      key={item.slug}
                      className="motion-card rounded-[1.5rem] border border-[#d2c3a8] bg-[#fffaf2] p-4 shadow-[0_14px_34px_rgba(79,58,28,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <button
                            type="button"
                            onClick={() => openPreview(item.slug)}
                            className="text-left font-display text-2xl text-forest-900 hover:text-forest-700"
                          >
                            {item.title}
                          </button>
                          <p className="mt-1 text-sm text-forest-600">{item.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.slug)}
                          className="icon-button rounded-full border border-[#d7cab2] bg-[#fffdf8] p-2 text-forest-700 shadow-[0_8px_18px_rgba(59,43,22,0.1)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 rounded-full border border-[#d5c8b1] bg-[#fffdf8] px-2 py-2 shadow-[0_6px_16px_rgba(79,58,28,0.06)]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                            className="icon-button rounded-full p-1 text-forest-900"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-8 text-center text-sm font-medium text-forest-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                            className="icon-button rounded-full p-1 text-forest-900"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.22em] text-forest-500">
                            Total
                          </p>
                          <p className="mt-1 text-sm font-semibold text-forest-900">
                            {formatCurrency(item.priceIdr * item.quantity, currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.6rem] border border-[#d2c3a8] bg-[#fffaf2] p-6 text-sm leading-7 text-forest-700 shadow-[0_14px_34px_rgba(79,58,28,0.08)]">
                  Your cabinet is empty. Add a piece from the catalogue, then preview it or take it straight to bank transfer checkout here.
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4 border-t border-[#d8ccb6] pt-5">
              <div className="flex items-center justify-between text-sm text-forest-700">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotalIdr, currency)}</span>
              </div>
              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={startBankTransferForCart}
                  disabled={!cartProducts.length}
                  className="button-lift rounded-full bg-forest-900 px-5 py-3 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Checkout with bank transfer
                </button>
                <Link
                  href="/catalogue"
                  onClick={closeCabinet}
                  className="button-lift rounded-full border border-[#cdbfa6] bg-[#fffaf1] px-5 py-3 text-center text-sm text-forest-700 shadow-[0_8px_18px_rgba(59,43,22,0.08)]"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(7,18,12,0.42)] p-4 backdrop-blur-lg lg:hidden">
          <div className="menu-surface ml-auto max-w-sm rounded-[2rem] border border-[#d7cab2] bg-[#f8f1e6] p-6 text-forest-900 shadow-[0_24px_60px_rgba(28,25,18,0.24)]">
            <div className="flex items-center justify-between">
              <p className="font-display text-2xl text-forest-900">Menu</p>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="icon-button rounded-full border border-[#d7cab2] bg-[#fffdf8] p-2 text-forest-900 shadow-[0_8px_18px_rgba(59,43,22,0.12)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="mt-6 grid gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="nav-link whitespace-nowrap rounded-[1rem] border border-[#d7cab2] bg-[#fffaf1] px-4 py-3 text-base text-forest-900 shadow-[0_8px_18px_rgba(59,43,22,0.08)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

