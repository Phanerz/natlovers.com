"use client";

import Image from "next/image";
import type {Route} from "next";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {ChevronDown, Menu, Search, ShoppingBag, User, X} from "lucide-react";
import {signOut, useSession} from "next-auth/react";
import {formatCurrency} from "@/lib/format";
import {lineExtraAmount, lineUnitPrice, unitPrice} from "@/lib/pricing";
import {selectionExtras} from "@/lib/product-options";
import {BagSidebar} from "@/components/bag/bag-sidebar";
import {getDictionary} from "@/lib/translations";
import {FlagIcon} from "@/components/flag-icon";
import {NavAccountMenu} from "@/components/nav-account-menu";
import {NavPreferencesModal} from "@/components/nav-preferences-modal";
import {NavSearchModal} from "@/components/nav-search-modal";
import {useScrollLock} from "@/components/use-scroll-lock";
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
// section's own snap distance would need  -  fast enough to feel immediate,
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
    getCartSubtotal
  } = useStorefront();

  const {data: session, status: sessionStatus} = useSession();

  const [query, setQuery] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(accountMenuRef, () => setAccountOpen(false), accountOpen);
  const {mounted: searchMounted, entered: searchEntered} = useDelayedMount(searchOpen);
  const {mounted: cabinetMounted, entered: cabinetEntered} = useDelayedMount(cabinetOpen);
  const {mounted: mobileMounted, entered: mobileEntered} = useDelayedMount(mobileOpen);
  useScrollLock(mobileMounted);

  // The bar stays put on every screen: it is the fixed top of each page.

  // Shopping Bag drawer: focus moves into the
  // drawer and is kept there, Escape closes it, and focus goes back to
  // whatever opened it.
  const bagPanelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!cabinetMounted) {
      return;
    }
    // (No body overflow lock here: this site scrolls through its own section
    // navigator, and changing the body's overflow made the page jump back to the
    // top and drop the navbar. The overlay's data-scroll-lock already stops the
    // page scrolling behind the drawer. Focus never scrolls either.)
    const opener = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      bagPanelRef.current?.querySelector<HTMLElement>("[data-bag-close]")?.focus({preventScroll: true});
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeCabinet();
        closeAllCabinetViews();
        return;
      }
      if (event.key !== "Tab" || !bagPanelRef.current) {
        return;
      }
      const focusable = Array.from(
        bagPanelRef.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
      opener?.focus?.({preventScroll: true});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cabinetMounted]);

  const dict = getDictionary(locale);
  const navItems: Array<{href: Route; label: string}> = [
    {href: "/", label: dict.nav.home},
    {href: "/catalogue", label: dict.nav.catalogue},
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
  // router.push resolves, instead of snapping back to the origin first  - 
  // cleared once the new route's activeHref actually catches up to match
  // (or, failing that, by the backstop timeout below).
  const pendingNavHrefRef = useRef<string | null>(null);
  const pendingNavTimeoutRef = useRef<number | null>(null);

  function isActiveHref(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  }

  const routeActiveHref = navItems.find((item) => isActiveHref(item.href))?.href ?? navItems[0].href;
  // A page can embed multiple nav-worthy sections under one route (the home
  // page's Hero and Catalogue both live at "/")  -  when that's happening,
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
  // actually catches up to match, that pin is released  -  by then
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
  // standalone route now  -  from anywhere off "/" (including one of those
  // routes itself), a nav click is a normal navigation straight to the
  // target href.
  function goToNavHref(href: Route) {
    if (pathname !== "/") {
      router.push(href);
      return;
    }

    const target = document.querySelector(`[data-nav-href="${href}"]`);
    if (!target) {
      // No such section on this page, so route to the page instead of
      // leaving the click dead.
      router.push(href);
      return;
    }

    const headerEl = navRef.current?.closest("header");
    const offset = headerEl ? headerEl.getBoundingClientRect().height : 0;
    const targetY = target.getBoundingClientRect().top + window.scrollY - offset;
    smoothScrollTo(Math.max(0, targetY));
  }

  // Pure computation, no state writes: given a pointer's clientX, works out
  // where the pill should sit and which nav item it's currently nearest.
  // Shared by the move handler (live visual feedback) and the up handler
  // (the sole source of truth for the drop decision)  -  the up handler used
  // to instead read back the `dragLeft` state that only the move handler
  // ever wrote, so a drag fast enough to reach pointerup before a single
  // pointermove fired (a quick flick, not a slow deliberate drag) left that
  // state at its initial null and silently cancelled the whole drop, reading
  // as "dropping it on a page just snaps back to the origin item."
  function computeDragTarget(clientX: number) {
    const navBox = navRef.current?.getBoundingClientRect();
    if (!navBox || !indicator) {
      return null;
    }

    const half = indicator.width / 2;
    const max = Math.max(0, navBox.width - indicator.width);
    const left = Math.min(max, Math.max(0, clientX - navBox.left - half));

    // The pill's width magnetically snaps to whichever item it's currently
    // nearest, instead of staying frozen at the width of whatever item the
    // drag started from  -  otherwise, as soon as it slides over a
    // differently-sized label, it visibly stops matching anything it's
    // supposed to be hovering (reads as a glitch, not a drag).
    const dragCenter = left + indicator.width / 2;
    let closestWidth = indicator.width;
    let closestHref: Route | null = null;
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
        closestHref = item.href;
      }
    });

    return {navBox, left, closestHref, closestWidth};
  }

  function updateDragPosition(clientX: number) {
    const target = computeDragTarget(clientX);
    if (!target) {
      return;
    }

    setDragLeft(target.left);
    setDragWidth(target.closestWidth);
  }

  function handleIndicatorPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!indicator) {
      return;
    }

    // Suppresses the click-through navigation a <a> would otherwise fire
    // on pointerup  -  harmless here since it's always the already-active
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
    // releasePointerCapture throws NotFoundError if this pointer isn't
    // actually captured by this element (capture can be lost mid-gesture).
    // Uncaught, that exception would abort this handler before any of the
    // drag-state resets below ran, leaving the pill's render permanently
    // pinned to wherever it was last dragged  -  reading as the pill
    // freezing and never letting go.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Computed fresh from this event's own clientX, not read back from
    // dragLeft state  -  see computeDragTarget's comment for why.
    const target = computeDragTarget(event.clientX);
    const closestHref = target?.closestHref ?? null;
    const closestLink = closestHref ? linkRefs.current.get(closestHref) ?? null : null;

    if (target && closestHref && closestLink && closestHref !== activeHref) {
      // Glide the rest of the way to the destination pill's exact spot
      // instead of snapping back to the origin first  -  release should read
      // as "landing on the page you dropped on," not a bounce-back.
      const targetBox = closestLink.getBoundingClientRect();
      setDragLeft(targetBox.left - target.navBox.left);
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
      if (!product) {
        return null;
      }
      // Custom options (extra dolls, pets…) change the line's price and are listed under it.
      const extras = selectionExtras(product.customisation, item.config);
      return {
        ...product,
        price: lineUnitPrice(product, extras.lines, currency),
        details: extras.lines.map((line) => ({...line, extra: lineExtraAmount(product, line, currency)})),
        quantity: item.quantity,
        config: item.config
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const subtotal = cartProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const checkoutProducts =
    checkoutDraft?.items
      .map((item) => {
        const product = resolveProduct(item.slug, locale);
        if (!product) {
          return null;
        }
        const extras = selectionExtras(product.customisation, item.config);
        return {
          ...product,
          price: lineUnitPrice(product, extras.lines, currency),
          details: extras.lines.map((line) => ({...line, extra: lineExtraAmount(product, line, currency)})),
          quantity: item.quantity,
          config: item.config
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null) ?? [];
  function closeAllCabinetViews() {
    clearCheckoutDraft();
    closePreview();
  }

  if (pathname === "/aoh") {
    return null;
  }

  return (
    <>
      {/* backdrop-blur-md below the sm breakpoint, backdrop-blur-xl at sm+  - 
          this is the one blur that's genuinely live every scroll frame on
          every page (the header is sticky), so it gets the mobile-tier
          reduction DESIGN.md calls for; every other glass surface in the app
          is either already blur-free or only mounted transiently. */}
      <header
        ref={headerRef}
        className="site-header sticky top-0 z-40 min-h-[var(--header-height)] bg-forest-900/80 text-sand-50 shadow-[0_16px_48px_rgba(0,0,0,0.32)] backdrop-blur-md max-lg:bg-forest-900 max-lg:shadow-none max-lg:backdrop-blur-none sm:backdrop-blur-xl"
      >
        <div className="shell flex min-h-[var(--header-height)] items-center justify-between gap-4 py-3 max-lg:grid max-lg:h-full max-lg:grid-cols-[1fr_auto_1fr] max-lg:gap-2 max-lg:py-2">
          <Link
            href="/"
            aria-label="Go to Natlovers homepage"
            className="button-lift flex items-center rounded-[1.55rem] border border-[#fff1cf]/22 bg-[#f2e7d0] px-3 py-2 shadow-[0_14px_34px_rgba(0,0,0,0.24)] max-lg:order-2 max-lg:justify-self-center max-lg:rounded-2xl max-lg:px-3 max-lg:py-1.5 max-lg:shadow-none"
          >
            <Image
              src="/natlovers-logo.avif"
              alt="Natlovers logo"
              width={220}
              height={62}
              className="h-auto w-[148px] object-contain min-[400px]:w-[162px] sm:w-[180px] lg:w-[220px]"
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
                  // whatever it was passing over  -  mid-morph (which is most
                  // of the time, since width animates) the real label
                  // underneath wasn't fully covered yet, so the zoomed clone
                  // text and the real text showed through side by side and
                  // read as garbled double vision. A solid frosted pill that
                  // cleanly covers whatever it slides over (via the
                  // z-index bump in .is-dragging) reads as an intentional
                  // "picked up and moving" object instead.
                  // Position travels via transform: translateX() (GPU-
                  // compositable) instead of the `left` offset itself  - 
                  // `left` stays permanently 0 (set in the .liquid-glass-
                  // active CSS rule). The drag-lift scale/translateY has to
                  // be combined into this same transform string rather than
                  // left as a separate CSS-class transform, since an inline
                  // style's `transform` always wins over a class's and the
                  // two can't apply simultaneously otherwise.
                  const liftTransform = isDragging ? " scale(1.07) translateY(-3px)" : "";

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
                        width: lensWidth,
                        transform: `translateX(${lensLeft}px)${liftTransform}`,
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
                    // in-page scroll, not a real navigation  -  except from
                    // somewhere off-flow (a product detail page), where
                    // goToNavHref falls back to an actual route change.
                    event.preventDefault();
                    goToNavHref(item.href);
                  }}
                  // The active link visually sits directly on top of the glass
                  // indicator (that's the whole point  -  it reads as one pill).
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

          <div className="flex items-center gap-3 text-sand-50 max-lg:contents">
            <div className="flex items-center gap-3 max-lg:order-3 max-lg:justify-self-end max-lg:gap-2">
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setSelectorOpen((open) => !open)}
                suppressHydrationWarning
                className="liquid-glass control-pill header-text-shadow inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#fff7e5]"
              >
                <FlagIcon locale={locale} className="h-3.5 w-5 shrink-0 rounded-[2px]" />
                <span>{currency}</span>
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
              className="liquid-glass icon-button header-text-shadow rounded-full p-2 text-[#fff7e5] max-lg:hidden"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Cart"
              onClick={openCabinet}
              className="liquid-glass icon-button header-text-shadow relative rounded-full p-2 text-[#fff7e5] max-lg:order-4"
            >
              <ShoppingBag className="h-4 w-4" />
              {cartItems.length ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-900 px-1 text-[10px] font-semibold text-sand-50">
                  {cartItems.length}
                </span>
              ) : null}
            </button>

            <div className="relative max-lg:order-5" ref={accountMenuRef}>
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
            </div>

            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
              className="liquid-glass icon-button header-text-shadow rounded-full p-2 text-[#fff7e5] max-lg:order-1 max-lg:justify-self-start lg:hidden"
            >
              <Menu className="h-[1.15rem] w-[1.15rem]" />
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
            router.push(`/catalogue/${slug}` as Route);
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}

      {cabinetMounted ? (
        <BagSidebar
          // A new checkout (or a closed and reopened bag) starts at the right step.
          key={checkoutDraft ? "direct" : "bag"}
          entered={cabinetEntered}
          panelRef={bagPanelRef}
          items={cartProducts}
          checkoutItems={checkoutDraft ? checkoutProducts : undefined}
          currency={currency}
          initialStep={checkoutDraft ? "delivery" : "bag"}
          onClose={() => {
            closeCabinet();
            closeAllCabinetViews();
          }}
          onRemove={removeFromCart}
          onQuantity={updateQuantity}
          onOrderPlaced={clearCart}
        />
      ) : null}

      {mobileMounted ? (
        <div
          data-scroll-lock
          onClick={() => setMobileOpen(false)}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,18,11,0.55)] p-5 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
            mobileEntered ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            onClick={(event) => event.stopPropagation()}
            className={`m-menu ${mobileEntered ? "is-in" : ""}`}
          >
            <div className="m-menu__top">
              <label className="m-menu__search">
                <Search aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={locale === "en" ? "Search the catalogue" : "Cari di katalog"}
                  enterKeyHint="search"
                  autoComplete="off"
                  aria-label="Search"
                />
              </label>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="m-menu__close">
                <X aria-hidden />
              </button>
            </div>

            {query.trim() ? (
              <div className="m-menu__body">
                {results.length ? (
                  <ul className="m-menu__results">
                    {results.slice(0, 4).map((product) => (
                      <li key={product.slug}>
                        <button
                          type="button"
                          onClick={() => {
                            router.push(`/catalogue/${product.slug}` as Route);
                            setMobileOpen(false);
                          }}
                        >
                          <span className="m-menu__thumb">
                            {product.imageUrl ? (
                              <Image src={product.imageUrl} alt="" fill sizes="56px" className="object-contain p-1" />
                            ) : null}
                          </span>
                          <span className="m-menu__rname">{product.title}</span>
                          <span className="m-menu__rprice">{formatCurrency(unitPrice(product, currency), currency)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="m-menu__empty">No pieces match that search yet.</p>
                )}
                <button
                  type="button"
                  className="m-menu__more"
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/catalogue");
                  }}
                >
                  View the full catalogue
                </button>
              </div>
            ) : (
              <nav className="m-menu__nav" aria-label="Main">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={item.href === activeHref ? "page" : undefined}
                    onClick={(event) => {
                      // On a phone the menu opens the page itself, not a scroll to a section.
                      event.preventDefault();
                      setMobileOpen(false);
                      if (item.href === pathname) {
                        window.scrollTo({top: 0});
                        document.querySelector(".home-main")?.scrollTo({top: 0});
                      }
                      else router.push(item.href);
                    }}
                    className={`m-menu__link ${item.href === activeHref ? "is-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}

            <p className="m-menu__sign">{locale === "en" ? "Handcrafted in Yogyakarta" : "Dibuat tangan di Yogyakarta"}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}

