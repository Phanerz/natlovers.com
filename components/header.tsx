"use client";

import Image from "next/image";
import type {Route} from "next";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {
  ChevronDown,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X
} from "lucide-react";
import {signOut, useSession} from "next-auth/react";
import {formatCurrency} from "@/lib/format";
import {getDictionary} from "@/lib/translations";
import {NavAccountMenu} from "@/components/nav-account-menu";
import {NavPreferencesModal} from "@/components/nav-preferences-modal";
import {NavSearchModal} from "@/components/nav-search-modal";
import {useActiveNavSection} from "@/components/use-active-nav-section";
import {useClickOutside} from "@/components/use-click-outside";
import {useDelayedMount} from "@/components/use-delayed-mount";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useStorefront} from "@/components/storefront-provider";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// A nav click can cover a lot more ground than one CSS-snapped section
// (Home to About is the whole page), so this runs longer than a single
// section's own snap distance would need — fast enough to feel immediate,
// slow enough not to be dizzying over that distance.
const NAV_JUMP_DURATION_MS = 420;

function smoothScrollTo(targetY: number) {
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) {
    return;
  }

  const startTime = performance.now();

  function step(now: number) {
    const t = Math.min(1, (now - startTime) / NAV_JUMP_DURATION_MS);
    window.scrollTo(0, startY + distance * easeOutCubic(t));
    if (t < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

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
    clearCart,
    startBankTransferForCart,
    clearCheckoutDraft,
    getCartSubtotalIdr
  } = useStorefront();

  const {data: session, status: sessionStatus} = useSession();

  const [query, setQuery] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(accountMenuRef, () => setAccountOpen(false), accountOpen);
  const [checkoutState, setCheckoutState] = useState<null | {
    orderRef: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    total: number;
  }>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [addressForm, setAddressForm] = useState({
    recipientName: "",
    phone: "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    country: "Indonesia"
  });
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Prefills from the customer's saved default address (see /api/account/
  // addresses) the first time the checkout panel opens, so a returning
  // customer isn't retyping their address on every order — falls back to
  // their account name for the recipient field when there's no saved
  // address yet.
  useEffect(() => {
    if (!checkoutDraft || addressLoaded) {
      return;
    }
    let cancelled = false;
    fetch("/api/account/addresses", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((list: Array<typeof addressForm & {isDefault: boolean}>) => {
        if (cancelled) return;
        const defaultAddress = Array.isArray(list) ? list.find((item) => item.isDefault) ?? list[0] : null;
        if (defaultAddress) {
          setAddressForm({
            recipientName: defaultAddress.recipientName,
            phone: defaultAddress.phone,
            street: defaultAddress.street,
            city: defaultAddress.city,
            province: defaultAddress.province ?? "",
            postalCode: defaultAddress.postalCode,
            country: defaultAddress.country
          });
        } else if (session?.user?.name) {
          setAddressForm((current) => ({...current, recipientName: session.user!.name ?? ""}));
        }
      })
      .finally(() => {
        if (!cancelled) setAddressLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutDraft, addressLoaded, session]);

  const addressComplete = Boolean(
    addressForm.recipientName.trim() &&
      addressForm.phone.trim() &&
      addressForm.street.trim() &&
      addressForm.city.trim() &&
      addressForm.postalCode.trim() &&
      addressForm.country.trim()
  );

  const {mounted: searchMounted, entered: searchEntered} = useDelayedMount(searchOpen);
  const {mounted: cabinetMounted, entered: cabinetEntered} = useDelayedMount(cabinetOpen);
  const {mounted: mobileMounted, entered: mobileEntered} = useDelayedMount(mobileOpen);

  const dict = getDictionary(locale);
  const navItems: Array<{href: Route; label: string}> = [
    {href: "/", label: dict.nav.home},
    {href: "/catalogue", label: dict.nav.catalogue},
    {href: "/custom", label: dict.nav.custom},
    {href: "/outlets", label: dict.nav.outlets},
    {href: "/about", label: dict.nav.about}
  ];

  const pathname = usePathname();
  const router = useRouter();
  const navRef = useRef<HTMLElement | null>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const [indicator, setIndicator] = useState<{left: number; width: number} | null>(null);
  const scrollSectionHref = useActiveNavSection();
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  // Set on drop when the glass is handed off toward a different page: keeps
  // the pill pinned at the destination pill's exact position/width while
  // router.push resolves, instead of snapping back to the origin first —
  // cleared once the new route's activeHref actually catches up to match
  // (or, failing that, by the backstop timeout below).
  const pendingNavHrefRef = useRef<string | null>(null);
  const pendingNavTimeoutRef = useRef<number | null>(null);

  function isActiveHref(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  const routeActiveHref = navItems.find((item) => isActiveHref(item.href))?.href ?? navItems[0].href;
  // A page can embed multiple nav-worthy sections under one route (the home
  // page's Hero and Catalogue both live at "/") — when that's happening,
  // which section is actually in view wins over the plain route match, so
  // the pill tracks what's on screen instead of sticking to "Home".
  const activeHref =
    scrollSectionHref && navItems.some((item) => item.href === scrollSectionHref) ? scrollSectionHref : routeActiveHref;

  useLayoutEffect(() => {
    function measure() {
      const nav = navRef.current;
      const activeLink = linkRefs.current.get(activeHref);
      if (!nav || !activeLink) {
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const linkBox = activeLink.getBoundingClientRect();
      setIndicator({left: linkBox.left - navBox.left, width: linkBox.width});
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref, locale]);

  // Once a drop hands off to a different item, the pill is pinned at the
  // destination's exact position (see handleIndicatorPointerUp) while the
  // scroll (or, rarely, a real navigation) resolves. The instant activeHref
  // actually catches up to match, that pin is released — by then
  // indicator.left already measures to the same value, so nothing visibly
  // jumps.
  useEffect(() => {
    if (pendingNavHrefRef.current && activeHref === pendingNavHrefRef.current) {
      pendingNavHrefRef.current = null;
      if (pendingNavTimeoutRef.current !== null) {
        window.clearTimeout(pendingNavTimeoutRef.current);
        pendingNavTimeoutRef.current = null;
      }
      setDragLeft(null);
      setDragWidth(null);
    }
  }, [activeHref]);

  // On "/", every section is already on the page, so a nav item is an
  // in-page jump to wherever its data-nav-href marker sits, not a route
  // change. Catalogue/Custom/Outlets/About also each have their own real
  // standalone route now — from anywhere off "/" (including one of those
  // routes itself), a nav click is a normal navigation straight to the
  // target href.
  function goToNavHref(href: Route) {
    if (pathname !== "/") {
      router.push(href);
      return;
    }

    const target = document.querySelector(`[data-nav-href="${href}"]`);
    if (!target) {
      return;
    }

    const headerEl = navRef.current?.closest("header");
    const offset = headerEl ? headerEl.getBoundingClientRect().height : 0;
    const targetY = target.getBoundingClientRect().top + window.scrollY - offset;
    smoothScrollTo(Math.max(0, targetY));
  }

  function updateDragPosition(clientX: number) {
    const navBox = navRef.current?.getBoundingClientRect();
    if (!navBox || !indicator) {
      return;
    }

    const half = indicator.width / 2;
    const max = Math.max(0, navBox.width - indicator.width);
    const left = Math.min(max, Math.max(0, clientX - navBox.left - half));
    setDragLeft(left);

    // The pill's width magnetically snaps to whichever item it's currently
    // nearest, instead of staying frozen at the width of whatever item the
    // drag started from — otherwise, as soon as it slides over a
    // differently-sized label, it visibly stops matching anything it's
    // supposed to be hovering (reads as a glitch, not a drag).
    const dragCenter = left + indicator.width / 2;
    let closestWidth = indicator.width;
    let closestDistance = Infinity;

    navItems.forEach((item) => {
      const link = linkRefs.current.get(item.href);
      if (!link) {
        return;
      }

      const linkBox = link.getBoundingClientRect();
      const center = linkBox.left - navBox.left + linkBox.width / 2;
      const distance = Math.abs(center - dragCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestWidth = linkBox.width;
      }
    });

    setDragWidth(closestWidth);
  }

  function handleIndicatorPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!indicator) {
      return;
    }

    // Suppresses the click-through navigation a <a> would otherwise fire
    // on pointerup — harmless here since it's always the already-active
    // link, but this keeps drag-vs-click unambiguous either way.
    event.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateDragPosition(event.clientX);
  }

  function handleIndicatorPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!draggingRef.current) {
      return;
    }

    updateDragPosition(event.clientX);
  }

  function handleIndicatorPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!draggingRef.current) {
      return;
    }

    draggingRef.current = false;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    const navBox = navRef.current?.getBoundingClientRect();
    const dropLeft = dragLeft;

    if (!navBox || dropLeft === null || !indicator) {
      setDragLeft(null);
      setDragWidth(null);
      return;
    }

    const dropCenter = dropLeft + indicator.width / 2;
    let closestHref: Route | null = null;
    let closestLink: HTMLAnchorElement | null = null;
    let closestDistance = Infinity;

    navItems.forEach((item) => {
      const link = linkRefs.current.get(item.href);
      if (!link) {
        return;
      }

      const linkBox = link.getBoundingClientRect();
      const center = linkBox.left - navBox.left + linkBox.width / 2;
      const distance = Math.abs(center - dropCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestHref = item.href;
        closestLink = link;
      }
    });

    if (closestHref && closestLink && closestHref !== activeHref) {
      // Glide the rest of the way to the destination pill's exact spot
      // instead of snapping back to the origin first — release should read
      // as "landing on the page you dropped on," not a bounce-back.
      const targetBox = (closestLink as HTMLAnchorElement).getBoundingClientRect();
      setDragLeft(targetBox.left - navBox.left);
      setDragWidth(targetBox.width);
      pendingNavHrefRef.current = closestHref;
      if (pendingNavTimeoutRef.current !== null) {
        window.clearTimeout(pendingNavTimeoutRef.current);
      }
      pendingNavTimeoutRef.current = window.setTimeout(() => {
        pendingNavHrefRef.current = null;
        pendingNavTimeoutRef.current = null;
        setDragLeft(null);
        setDragWidth(null);
      }, 2000);
      goToNavHref(closestHref);
    } else {
      setDragLeft(null);
      setDragWidth(null);
    }
  }

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
    if (!checkoutProducts.length || !addressComplete) {
      return;
    }

    setCheckoutLoading(true);
    setAddressError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          method: "bank_transfer",
          items: checkoutProducts.map((item) => ({slug: item.slug, quantity: item.quantity})),
          total: checkoutTotalIdr,
          address: addressForm
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setAddressError(payload?.error ?? "Could not place the order.");
        return;
      }
      setCheckoutState(payload);
      // The server always clears the full cart on a successful order (even
      // for a "direct buy" of one item), so the client cart needs to mirror
      // that immediately — otherwise the drawer keeps showing the
      // just-ordered item as if it were still sitting in the bag.
      if (payload?.ok) {
        clearCart();
      }
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
      <header className="sticky top-0 z-40 min-h-[var(--header-height)] bg-forest-900/80 text-sand-50 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-xl">
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

          <nav
            ref={navRef}
            className="liquid-glass relative hidden items-center gap-1 rounded-full px-2 py-2 lg:flex"
          >
            {indicator
              ? (() => {
                  const lensLeft = dragLeft ?? indicator.left;
                  const lensWidth = dragWidth ?? indicator.width;

                  // A magnified live clone of the nav labels used to render
                  // inside this pill while dragging, but it only ever lined
                  // up correctly at the instant its width exactly matched
                  // whatever it was passing over — mid-morph (which is most
                  // of the time, since width animates) the real label
                  // underneath wasn't fully covered yet, so the zoomed clone
                  // text and the real text showed through side by side and
                  // read as garbled double vision. A solid frosted pill that
                  // cleanly covers whatever it slides over (via the
                  // z-index bump in .is-dragging) reads as an intentional
                  // "picked up and moving" object instead.
                  return (
                    <span
                      aria-hidden
                      onPointerDown={handleIndicatorPointerDown}
                      onPointerMove={handleIndicatorPointerMove}
                      onPointerUp={handleIndicatorPointerUp}
                      onPointerCancel={handleIndicatorPointerUp}
                      className={`liquid-glass-active h-[calc(100%-0.5rem)] top-1 ${
                        isDragging ? "is-dragging" : "cursor-grab active:cursor-grabbing"
                      }`}
                      style={{
                        left: lensLeft,
                        width: lensWidth,
                        pointerEvents: "auto",
                        touchAction: "none",
                        cursor: isDragging ? "grabbing" : "grab"
                      }}
                    />
                  );
                })()
              : null}
            {navItems.map((item) => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  ref={(el) => {
                    if (el) {
                      linkRefs.current.set(item.href, el);
                    } else {
                      linkRefs.current.delete(item.href);
                    }
                  }}
                  href={item.href}
                  data-active={isActive}
                  onClick={(event) => {
                    // Every section lives on "/" now, so a plain click is an
                    // in-page scroll, not a real navigation — except from
                    // somewhere off-flow (a product detail page), where
                    // goToNavHref falls back to an actual route change.
                    event.preventDefault();
                    goToNavHref(item.href);
                  }}
                  // The active link visually sits directly on top of the glass
                  // indicator (that's the whole point — it reads as one pill).
                  // Its own z-10 means a pointerdown there hits this <a>, not
                  // the indicator span underneath, so the drag has to be
                  // initiated from here too, not just the indicator itself.
                  onPointerDown={isActive ? handleIndicatorPointerDown : undefined}
                  onPointerMove={isActive ? handleIndicatorPointerMove : undefined}
                  onPointerUp={isActive ? handleIndicatorPointerUp : undefined}
                  onPointerCancel={isActive ? handleIndicatorPointerUp : undefined}
                  className={`liquid-glass-link header-text-shadow relative z-10 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium tracking-[0.08em] text-[#fff7e5] ${
                    isActive ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
                  }`}
                  style={isActive ? {touchAction: "none"} : undefined}
                >
                  <span className="liquid-glass-label">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-sand-50">
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setSelectorOpen((open) => !open)}
                suppressHydrationWarning
                className="liquid-glass control-pill header-text-shadow inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#fff7e5]"
              >
                <span>{locale.toUpperCase()} / {currency}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              <NavPreferencesModal
                open={selectorOpen}
                locale={locale}
                currency={currency}
                onSelectLocale={(value) => {
                  setLocale(value);
                  setSelectorOpen(false);
                }}
                onSelectCurrency={(value) => {
                  setCurrency(value);
                  setSelectorOpen(false);
                }}
                onClose={() => setSelectorOpen(false)}
              />
            </div>

            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="liquid-glass icon-button header-text-shadow rounded-full p-2 text-[#fff7e5]"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Cart"
              onClick={openCabinet}
              className="liquid-glass icon-button header-text-shadow relative rounded-full p-2 text-[#fff7e5]"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartItems.length ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-900 px-1 text-[10px] font-semibold text-sand-50">
                  {cartItems.length}
                </span>
              ) : null}
            </button>

            <div className="relative" ref={accountMenuRef}>
              {sessionStatus === "authenticated" && session?.user ? (
                <>
                  <button
                    type="button"
                    aria-label="Account"
                    onClick={() => setAccountOpen((open) => !open)}
                    className="liquid-glass icon-button flex h-9 w-9 items-center justify-center overflow-hidden rounded-full p-0 text-[#fff7e5]"
                  >
                    {session.user.image ? (
                      <Image src={session.user.image} alt="" width={36} height={36} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-forest-900 text-xs font-semibold uppercase text-sand-50">
                        {(session.user.name ?? session.user.email ?? "?").charAt(0)}
                      </span>
                    )}
                  </button>
                  <NavAccountMenu
                    open={accountOpen}
                    name={session.user.name ?? "Natlovers collector"}
                    email={session.user.email ?? ""}
                    image={session.user.image}
                    onNavigate={() => setAccountOpen(false)}
                    onSignOut={() => {
                      setAccountOpen(false);
                      signOut({callbackUrl: "/signed-out"});
                    }}
                  />
                </>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign in"
                  className="liquid-glass icon-button header-text-shadow inline-flex items-center justify-center rounded-full p-2 text-[#fff7e5]"
                >
                  <User className="h-4 w-4" />
                </Link>
              )}
            </div>

            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
              className="liquid-glass icon-button header-text-shadow rounded-full p-2 text-[#fff7e5] lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {searchMounted ? (
        <NavSearchModal
          query={query}
          onQueryChange={setQuery}
          results={results}
          currency={currency}
          entered={searchEntered}
          onSelect={(slug) => {
            openPreview(slug);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}

      {cabinetMounted ? (
        <div
          data-scroll-lock
          onClick={() => {
            closeCabinet();
            closeAllCabinetViews();
          }}
          className={`fixed inset-0 z-50 bg-[rgba(7,18,12,0.36)] backdrop-blur-lg transition-opacity duration-200 ${
            cabinetEntered ? "opacity-100" : "opacity-0"
          } ${!cabinetEntered ? "pointer-events-none" : ""}`}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`ml-auto flex h-full w-full max-w-[33rem] flex-col border-l border-[#d7cab2] bg-[rgba(247,240,227,0.97)] p-6 shadow-[0_28px_90px_rgba(18,20,14,0.32)] transition-transform ${
              cabinetEntered
                ? "translate-x-0 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                : "translate-x-full duration-200 ease-in"
            }`}
          >
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
                className="glass-icon-btn rounded-full p-3 text-forest-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="card mt-4 px-4 py-4 text-sm text-forest-700">
              <span>Bag, preview, and bank-transfer checkout are live now.</span>
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
                      setAddressError(null);
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
                      className="flex items-center gap-4 rounded-[1rem] border border-white/18 bg-white/8 px-3 py-3"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.75rem] border border-white/15 bg-white/10">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sand-50">{item.title}</p>
                        <p className="text-xs uppercase tracking-[0.24em] text-sand-100/68">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <span className="shrink-0">{formatCurrency(item.priceIdr * item.quantity, currency)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-sand-50">
                  <span>Total</span>
                  <span>{formatCurrency(checkoutTotalIdr, currency)}</span>
                </div>

                {!checkoutState ? (
                  <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-sand-200/80">Shipping address</p>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <input
                        value={addressForm.recipientName}
                        onChange={(event) => setAddressForm((current) => ({...current, recipientName: event.target.value}))}
                        placeholder="Recipient name"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60"
                      />
                      <input
                        value={addressForm.phone}
                        onChange={(event) => setAddressForm((current) => ({...current, phone: event.target.value}))}
                        placeholder="Phone (for WhatsApp)"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60"
                      />
                      <input
                        value={addressForm.street}
                        onChange={(event) => setAddressForm((current) => ({...current, street: event.target.value}))}
                        placeholder="Street address"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60 sm:col-span-2"
                      />
                      <input
                        value={addressForm.city}
                        onChange={(event) => setAddressForm((current) => ({...current, city: event.target.value}))}
                        placeholder="City"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60"
                      />
                      <input
                        value={addressForm.province}
                        onChange={(event) => setAddressForm((current) => ({...current, province: event.target.value}))}
                        placeholder="Province / state (optional)"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60"
                      />
                      <input
                        value={addressForm.postalCode}
                        onChange={(event) => setAddressForm((current) => ({...current, postalCode: event.target.value}))}
                        placeholder="Postal code"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60"
                      />
                      <input
                        value={addressForm.country}
                        onChange={(event) => setAddressForm((current) => ({...current, country: event.target.value}))}
                        placeholder="Country"
                        className="rounded-xl border border-white/18 bg-white/8 px-3.5 py-2.5 text-sm text-sand-50 placeholder:text-sand-200/50 outline-none focus:border-sand-100/60"
                      />
                    </div>
                  </div>
                ) : null}

                {addressError ? <p className="mt-3 text-sm text-[#f3b4a0]">{addressError}</p> : null}

                {!checkoutState ? (
                  <button
                    type="button"
                    onClick={confirmBankTransfer}
                    disabled={checkoutLoading || !addressComplete}
                    className="button-lift mt-4 w-full rounded-full bg-sand-100 px-5 py-3 text-sm font-semibold text-forest-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {checkoutLoading
                      ? "Preparing transfer details..."
                      : addressComplete
                        ? "Generate bank transfer instructions"
                        : "Fill in your shipping address to continue"}
                  </button>
                ) : null}
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

            {/*
              A card's rounded corner and shadow sitting flush against a
              plain overflow:auto edge gets sliced by a hard rectangular
              boundary the instant the list scrolls even slightly — reading
              as the product card being "cut off" rather than just scrolled.
              Fading the scrollable area's own top/bottom edges via mask-
              image means whatever card is nearest that edge dissolves out
              gracefully instead of being hard-clipped.
            */}
            <div
              className="mt-6 flex-1 overflow-y-auto py-1 pr-1"
              style={{
                maskImage: "linear-gradient(to bottom, transparent, black 14px, black calc(100% - 14px), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent, black 14px, black calc(100% - 14px), transparent)"
              }}
            >
              {cartProducts.length ? (
                <div className="space-y-4">
                  {cartProducts.map((item) => (
                    <div
                      key={item.slug}
                      className="motion-card flex gap-4 rounded-[1.5rem] border border-[#d2c3a8] bg-[#fffaf2] p-4 shadow-[0_14px_34px_rgba(79,58,28,0.08)]"
                    >
                      <button
                        type="button"
                        onClick={() => openPreview(item.slug)}
                        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[1.1rem] border border-[#d5c8b1] bg-[#eee4cd] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
                      >
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt="" fill sizes="96px" className="object-contain p-1.5" />
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openPreview(item.slug)}
                              className="block w-full truncate text-left font-display text-xl text-forest-900 hover:text-forest-700"
                            >
                              {item.title}
                            </button>
                            <p className="mt-1 truncate text-sm text-forest-600">{item.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.slug)}
                            className="glass-icon-btn is-danger shrink-0 rounded-full p-2 text-forest-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="glass-stepper flex items-center gap-2 rounded-full px-2 py-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.slug, item.quantity - 1)}
                              className="glass-stepper-btn rounded-full p-1 text-forest-900"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-8 text-center text-sm font-medium text-forest-900">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.slug, item.quantity + 1)}
                              className="glass-stepper-btn rounded-full p-1 text-forest-900"
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
                  className="glass-btn-primary rounded-full px-5 py-3 text-sm font-semibold text-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Checkout with bank transfer
                </button>
                <Link
                  href="/catalogue"
                  onClick={closeCabinet}
                  className="glass-btn-secondary rounded-full px-5 py-3 text-center text-sm text-forest-700"
                >
                  Continue shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mobileMounted ? (
        <div
          data-scroll-lock
          onClick={() => setMobileOpen(false)}
          className={`fixed inset-0 z-50 bg-[rgba(7,18,12,0.42)] p-4 backdrop-blur-lg transition-opacity duration-200 lg:hidden ${
            mobileEntered ? "opacity-100" : "opacity-0"
          } ${!mobileEntered ? "pointer-events-none" : ""}`}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`menu-surface ml-auto max-w-sm rounded-[2rem] border border-[#d7cab2] bg-[#f8f1e6] p-6 text-forest-900 shadow-[0_24px_60px_rgba(28,25,18,0.24)] transition-all ${
              mobileEntered
                ? "translate-x-0 scale-100 opacity-100 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                : "translate-x-10 scale-[0.9] opacity-0 duration-150 ease-in"
            }`}
          >
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
                  onClick={(event) => {
                    event.preventDefault();
                    setMobileOpen(false);
                    goToNavHref(item.href);
                  }}
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

