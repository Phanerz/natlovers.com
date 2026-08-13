"use client";

import {useEffect, useLayoutEffect, useMemo, useRef, useState} from "react";
import type {PointerEvent as ReactPointerEvent} from "react";
import {Baby, ChevronDown, Gem, PanelLeftClose, PanelLeftOpen, Shirt, ShoppingBag, SlidersHorizontal, X} from "lucide-react";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {useClickOutside} from "@/components/use-click-outside";
import {useDelayedMount} from "@/components/use-delayed-mount";
import {FilterSidebar} from "./filter-sidebar";
import {ShopProductCard} from "./shop-product-card";
import {
  AccessoryCategory,
  ShopGender,
  ShopHandle,
  ShopMaterial,
  ShopProduct,
  ShopProductType,
  ShopShape,
  ShopSize,
  productTypeLabels,
  shopProductTypes
} from "./shop-data";

type SortOption = "newest" | "price-asc" | "price-desc" | "name-asc";

const sortOptions: Array<{value: SortOption; label: string}> = [
  {value: "newest", label: "Newest"},
  {value: "price-asc", label: "Price: Low to High"},
  {value: "price-desc", label: "Price: High to Low"},
  {value: "name-asc", label: "Name: A–Z"}
];

const productTypeIcons: Record<ShopProductType, typeof ShoppingBag> = {
  Bags: ShoppingBag,
  Dolls: Baby,
  Accessories: Gem,
  Apparels: Shirt
};

/**
 * Fixed, breakpoint-matched capacity instead of measuring the live grid: 2
 * rows always, but the column count (and so the capacity) grows from 4 to 5
 * when the sidebar is collapsed. Reclaiming the sidebar's width by only
 * widening the existing 4 columns would blow each card up disproportionately
 * (and, combined with the fixed aspect-square, push a 2-row layout taller
 * than the viewport); adding a 5th column instead keeps each card close to
 * its original size — the freed width is spent on showing one more item, not
 * on inflating the ones already there.
 */
const MOBILE_BREAKPOINT = 640;
const DESKTOP_COLUMNS = 4;
const DESKTOP_COLUMNS_COLLAPSED = 5;
const DESKTOP_CAPACITY = DESKTOP_COLUMNS * 2;
const DESKTOP_CAPACITY_COLLAPSED = DESKTOP_COLUMNS_COLLAPSED * 2;
const MOBILE_CAPACITY = 6;

/**
 * Real momentum physics instead of discrete page-jumps. Every page (one
 * screen's worth of cards) sits side by side in one continuous flex strip;
 * a wheel gesture adds an impulse to a velocity value, and a
 * requestAnimationFrame loop integrates position += velocity * dt every
 * frame while velocity decays by a fixed per-millisecond friction factor —
 * so a hard/fast/long scroll keeps gliding under its own momentum exactly
 * as long as the physics says it should, not a fixed animation duration.
 * Once velocity drops below a threshold, the loop switches to a fast
 * exponential ease toward the nearest page boundary (the "roulette ball
 * dropping into a slot") so it always comes to rest aligned on a page
 * instead of stopping mid-scroll. The transform is written straight to the
 * DOM node every frame (not through React state) so nothing here waits on
 * a re-render.
 */
const WHEEL_MIN_DELTA = 12;
const VELOCITY_SCALE = 0.000023;
const MAX_VELOCITY = 0.03;
const FRICTION_HALF_LIFE_MS = 180;
const FRICTION_PER_MS = Math.pow(0.5, 1 / FRICTION_HALF_LIFE_MS);
const SETTLE_VELOCITY = 0.00003;
const SETTLE_HALF_LIFE_MS = 55;
const SETTLE_DECAY_PER_MS = Math.pow(0.5, 1 / SETTLE_HALF_LIFE_MS);
const SETTLE_EPSILON = 0.0015;
const MAX_FRAME_DT_MS = 48;

const SIDEBAR_DURATION_MS = 650;
const SIDEBAR_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

function isScrollLocked(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest("[data-scroll-lock]")) {
    return true;
  }

  const conditional = target.closest<HTMLElement>("[data-scroll-lock-if-overflow]");
  return Boolean(conditional && conditional.scrollHeight > conditional.clientHeight + 1);
}

export function CatalogueContent() {
  const {currency, locale} = useSitePreferences();

  // The whole catalogue now lives in Postgres — this fetch is the single
  // source, so admin creates/edits/deactivations show up immediately
  // without a redeploy.
  const [products, setProducts] = useState<ShopProduct[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/admin/products", {cache: "no-store"})
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) {
          return;
        }
        setProducts(data as ShopProduct[]);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const [selectedProductType, setSelectedProductType] = useState<ShopProductType>("Bags");
  const [selectedMaterials, setSelectedMaterials] = useState<ShopMaterial[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<ShopSize[]>([]);
  const [selectedShapes, setSelectedShapes] = useState<ShopShape[]>([]);
  const [selectedHandles, setSelectedHandles] = useState<ShopHandle[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<ShopGender[]>([]);
  const [selectedAccessoryCategories, setSelectedAccessoryCategories] = useState<AccessoryCategory[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  useClickOutside(sortMenuRef, () => setSortOpen(false), sortOpen);
  const {mounted: sortMenuMounted, entered: sortMenuEntered} = useDelayedMount(sortOpen, 120);
  const [pageIndex, setPageIndex] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const {mounted: mobileFiltersMounted, entered: mobileFiltersEntered} = useDelayedMount(mobileFiltersOpen, 180);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [capacity, setCapacity] = useState(DESKTOP_CAPACITY);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotionRef = useRef(false);

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Map<ShopProductType, HTMLButtonElement>>(new Map());
  const [tabIndicator, setTabIndicator] = useState<{left: number; width: number} | null>(null);
  const draggingTabRef = useRef(false);
  const [isTabDragging, setIsTabDragging] = useState(false);
  const [tabDragLeft, setTabDragLeft] = useState<number | null>(null);
  const [tabDragWidth, setTabDragWidth] = useState<number | null>(null);
  const [dragOverType, setDragOverType] = useState<ShopProductType | null>(null);
  // Set on drop when the pill is handed off toward a different tab: keeps it
  // pinned at the destination tab's exact position/width while
  // selectProductType's state update (and the tabIndicator layout effect
  // that follows it) resolves, instead of snapping back to the origin tab
  // first. Cleared once selectedProductType actually catches up to match
  // (or, failing that, by the backstop timeout below) — same handoff
  // pattern as the navbar's drag indicator in header.tsx.
  const pendingTabTypeRef = useRef<ShopProductType | null>(null);
  const pendingTabTimeoutRef = useRef<number | null>(null);

  const progressTrackRef = useRef<HTMLDivElement | null>(null);
  const draggingProgressRef = useRef(false);
  const [isProgressDragging, setIsProgressDragging] = useState(false);

  const offsetPagesRef = useRef(0);
  const velocityRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const maxPageIndexRef = useRef(0);
  const pageCountRef = useRef(1);

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    function updateCapacity() {
      if (window.innerWidth < MOBILE_BREAKPOINT) {
        setCapacity(MOBILE_CAPACITY);
      } else {
        setCapacity(sidebarCollapsed ? DESKTOP_CAPACITY_COLLAPSED : DESKTOP_CAPACITY);
      }
    }

    updateCapacity();
    window.addEventListener("resize", updateCapacity);
    return () => window.removeEventListener("resize", updateCapacity);
  }, [sidebarCollapsed]);

  function selectProductType(type: ShopProductType) {
    if (type === selectedProductType) {
      return;
    }

    setSelectedProductType(type);
    setSelectedMaterials([]);
    setSelectedSizes([]);
    setSelectedShapes([]);
    setSelectedHandles([]);
    setSelectedGenders([]);
    setSelectedAccessoryCategories([]);
  }

  useLayoutEffect(() => {
    function measure() {
      const container = tabsRef.current;
      const activeTab = tabRefs.current.get(selectedProductType);
      if (!container || !activeTab) {
        return;
      }

      const containerBox = container.getBoundingClientRect();

      const tabBox = activeTab.getBoundingClientRect();
      setTabIndicator({left: tabBox.left - containerBox.left, width: tabBox.width});
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [selectedProductType, locale]);

  // Once a drop hands off to a different tab, the pill is pinned at the
  // destination's exact position (see handleTabIndicatorPointerUp) while
  // selectProductType's state update resolves. The instant selectedProductType
  // actually catches up to match, that pin is released — by then tabIndicator
  // already measures to the same value, so nothing visibly jumps.
  useEffect(() => {
    if (pendingTabTypeRef.current && selectedProductType === pendingTabTypeRef.current) {
      pendingTabTypeRef.current = null;
      if (pendingTabTimeoutRef.current !== null) {
        window.clearTimeout(pendingTabTimeoutRef.current);
        pendingTabTimeoutRef.current = null;
      }
      setTabDragLeft(null);
      setTabDragWidth(null);
      setDragOverType(null);
    }
  }, [selectedProductType]);

  function updateTabDragPosition(clientX: number) {
    const containerBox = tabsRef.current?.getBoundingClientRect();
    if (!containerBox || !tabIndicator) {
      return;
    }

    const half = tabIndicator.width / 2;
    const max = Math.max(0, containerBox.width - tabIndicator.width);
    const left = Math.min(max, Math.max(0, clientX - containerBox.left - half));
    setTabDragLeft(left);

    // Snap the pill's width to whichever tab it's currently nearest, rather
    // than staying frozen at the width of whatever tab the drag started
    // from — otherwise it visibly stops matching any label as soon as it
    // slides over one of a different size.
    const dragCenter = left + tabIndicator.width / 2;
    let closestWidth = tabIndicator.width;
    let closestType: ShopProductType | null = null;
    let closestDistance = Infinity;

    shopProductTypes.forEach((type) => {
      const tab = tabRefs.current.get(type);
      if (!tab) {
        return;
      }

      const tabBox = tab.getBoundingClientRect();
      const center = tabBox.left - containerBox.left + tabBox.width / 2;
      const distance = Math.abs(center - dragCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestWidth = tabBox.width;
        closestType = type;
      }
    });

    setTabDragWidth(closestWidth);
    // The label directly under the pill needs to switch to light text as
    // soon as the pill slides onto it — waiting for drop would leave a dark
    // label sitting underneath an opaque dark pill while dragging, which is
    // exactly the "can't read the text while dragging" bug this fixes.
    setDragOverType(closestType);
  }

  function handleTabIndicatorPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!tabIndicator) {
      return;
    }

    // Suppresses the click-through this would otherwise fire on the active
    // tab button — harmless (it's already selected) but keeps drag-vs-click
    // unambiguous either way.
    event.preventDefault();
    draggingTabRef.current = true;
    setIsTabDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateTabDragPosition(event.clientX);
  }

  function handleTabIndicatorPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!draggingTabRef.current) {
      return;
    }

    updateTabDragPosition(event.clientX);
  }

  function handleTabIndicatorPointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (!draggingTabRef.current) {
      return;
    }

    draggingTabRef.current = false;
    setIsTabDragging(false);
    // releasePointerCapture throws NotFoundError if this pointer isn't
    // actually captured by this element — which can happen (capture can be
    // lost mid-gesture, e.g. if the browser silently declined to grant it,
    // or another element stole it). Uncaught, that exception aborted the
    // rest of this handler before the tabDragLeft/tabDragWidth resets below
    // ever ran, leaving the pill's render permanently pinned to its last
    // dragged position (nothing ever nulled those out again) — reading as
    // the pill freezing mid-drag and never letting go.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const containerBox = tabsRef.current?.getBoundingClientRect();
    const dropLeft = tabDragLeft;

    if (!containerBox || dropLeft === null || !tabIndicator) {
      setTabDragLeft(null);
      setTabDragWidth(null);
      setDragOverType(null);
      return;
    }

    const dropCenter = dropLeft + tabIndicator.width / 2;
    let closestType: ShopProductType | null = null;
    let closestTab: HTMLButtonElement | null = null;
    let closestDistance = Infinity;

    shopProductTypes.forEach((type) => {
      const tab = tabRefs.current.get(type);
      if (!tab) {
        return;
      }

      const tabBox = tab.getBoundingClientRect();
      const center = tabBox.left - containerBox.left + tabBox.width / 2;
      const distance = Math.abs(center - dropCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestType = type;
        closestTab = tab;
      }
    });

    if (closestType && closestTab && closestType !== selectedProductType) {
      // Glide the rest of the way to the destination tab's exact spot
      // instead of snapping back to the origin first — release should read
      // as "landing on the tab you dropped on," not a bounce-back.
      const targetBox = (closestTab as HTMLButtonElement).getBoundingClientRect();
      setTabDragLeft(targetBox.left - containerBox.left);
      setTabDragWidth(targetBox.width);
      setDragOverType(closestType);
      pendingTabTypeRef.current = closestType;
      if (pendingTabTimeoutRef.current !== null) {
        window.clearTimeout(pendingTabTimeoutRef.current);
      }
      pendingTabTimeoutRef.current = window.setTimeout(() => {
        pendingTabTypeRef.current = null;
        pendingTabTimeoutRef.current = null;
        setTabDragLeft(null);
        setTabDragWidth(null);
        setDragOverType(null);
      }, 2000);
      selectProductType(closestType);
    } else {
      setTabDragLeft(null);
      setTabDragWidth(null);
      setDragOverType(null);
    }
  }

  function toggleMaterial(value: ShopMaterial) {
    setSelectedMaterials((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function toggleSize(value: ShopSize) {
    setSelectedSizes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function toggleShape(value: ShopShape) {
    setSelectedShapes((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function toggleHandle(value: ShopHandle) {
    setSelectedHandles((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function toggleGender(value: ShopGender) {
    setSelectedGenders((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  function toggleAccessoryCategory(value: AccessoryCategory) {
    setSelectedAccessoryCategories((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  const typeProducts = useMemo(
    () => products.filter((product) => product.productType === selectedProductType),
    [products, selectedProductType]
  );

  const filteredProducts = useMemo(() => {
    const filtered = typeProducts.filter((product) => {
      // Materials/size apply to Bags and Dolls; shape/handle to Bags only;
      // gender to Dolls only; category to Accessories only — each guard
      // only ever runs against the type it belongs to, since the other
      // types' selection state stays empty (reset on type switch).
      if (selectedMaterials.length && !product.materials.some((material) => selectedMaterials.includes(material))) {
        return false;
      }

      if (selectedSizes.length && (!product.size || !selectedSizes.includes(product.size))) {
        return false;
      }

      if (selectedShapes.length && (!product.shape || !selectedShapes.includes(product.shape))) {
        return false;
      }

      if (selectedHandles.length && (!product.handle || !selectedHandles.includes(product.handle))) {
        return false;
      }

      if (selectedGenders.length && (!product.gender || !selectedGenders.includes(product.gender))) {
        return false;
      }

      if (
        selectedAccessoryCategories.length &&
        (!product.accessoryCategory || !selectedAccessoryCategories.includes(product.accessoryCategory))
      ) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered];

    if (sort === "price-asc") {
      sorted.sort((a, b) => a.priceIdr - b.priceIdr);
    } else if (sort === "price-desc") {
      sorted.sort((a, b) => b.priceIdr - a.priceIdr);
    } else if (sort === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [
    typeProducts,
    selectedMaterials,
    selectedSizes,
    selectedShapes,
    selectedHandles,
    selectedGenders,
    selectedAccessoryCategories,
    sort
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / capacity));
  const maxPageIndex = pageCount - 1;
  const clampedPageIndex = Math.min(pageIndex, maxPageIndex);
  const clampedStart = clampedPageIndex * capacity;
  const columnClass = capacity === DESKTOP_CAPACITY_COLLAPSED ? "sm:grid-cols-5" : "sm:grid-cols-4";

  // Keep refs in sync with the latest render so the long-lived rAF loop and
  // the wheel handler (both registered once via refs, not re-created every
  // render) always read current values instead of a stale closure.
  maxPageIndexRef.current = maxPageIndex;
  pageCountRef.current = pageCount;

  // Writes both the grid's transform and the bottom progress thumb's
  // position straight to the DOM every physics frame — this is what makes
  // the thumb visibly slide in lockstep with the actual scroll instead of
  // only jumping to its final spot once the motion settles.
  function applyScrollVisuals(offset: number) {
    const pageCountNow = pageCountRef.current;
    const pct = 100 / pageCountNow;

    const track = trackRef.current;
    if (track) {
      track.style.transform = `translateX(${-offset * pct}%)`;
    }

    const thumb = thumbRef.current;
    if (thumb) {
      thumb.style.left = `${offset * pct}%`;
      thumb.style.width = `${pct}%`;
    }
  }

  function stopPhysicsLoop() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }

  function resetScroll() {
    stopPhysicsLoop();
    velocityRef.current = 0;
    offsetPagesRef.current = 0;
    applyScrollVisuals(0);
    setPageIndex(0);
  }

  // Any change that reshuffles what's being shown snaps the strip back to
  // the first page instead of leaving it wherever momentum last left it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(resetScroll, [
    selectedProductType,
    selectedMaterials,
    selectedSizes,
    selectedShapes,
    selectedHandles,
    selectedGenders,
    selectedAccessoryCategories,
    sort,
    capacity
  ]);

  useEffect(() => stopPhysicsLoop, []);

  function tick(now: number) {
    if (lastFrameTimeRef.current === null) {
      lastFrameTimeRef.current = now;
    }

    const dt = Math.min(MAX_FRAME_DT_MS, now - lastFrameTimeRef.current);
    lastFrameTimeRef.current = now;

    const maxIdx = maxPageIndexRef.current;
    let offset = offsetPagesRef.current;
    let velocity = velocityRef.current;

    if (Math.abs(velocity) > SETTLE_VELOCITY) {
      offset += velocity * dt;
      velocity *= Math.pow(FRICTION_PER_MS, dt);

      if (offset <= 0 && velocity < 0) {
        offset = 0;
        velocity = 0;
      }

      if (offset >= maxIdx && velocity > 0) {
        offset = maxIdx;
        velocity = 0;
      }

      offsetPagesRef.current = offset;
      velocityRef.current = velocity;
      applyScrollVisuals(offset);
      rafIdRef.current = requestAnimationFrame(tick);
      return;
    }

    // Settling: ease toward the nearest page boundary — the "roulette ball
    // dropping into a slot" — instead of stopping wherever friction left it.
    const target = Math.min(maxIdx, Math.max(0, Math.round(offset)));
    const diff = target - offset;

    if (Math.abs(diff) < SETTLE_EPSILON) {
      offsetPagesRef.current = target;
      velocityRef.current = 0;
      applyScrollVisuals(target);
      rafIdRef.current = null;
      lastFrameTimeRef.current = null;
      setPageIndex(target);
      return;
    }

    offset += diff * (1 - Math.pow(SETTLE_DECAY_PER_MS, dt));
    offsetPagesRef.current = offset;
    velocityRef.current = 0;
    applyScrollVisuals(offset);
    rafIdRef.current = requestAnimationFrame(tick);
  }

  function startPhysicsLoop() {
    if (rafIdRef.current !== null) {
      return;
    }
    lastFrameTimeRef.current = null;
    rafIdRef.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const node = contentRef.current;
    if (!node) {
      return;
    }

    function handleWheel(event: WheelEvent) {
      if (isScrollLocked(event.target)) {
        return;
      }

      if (Math.abs(event.deltaY) < WHEEL_MIN_DELTA) {
        event.preventDefault();
        return;
      }

      const direction = event.deltaY > 0 ? 1 : -1;
      const atRest = rafIdRef.current === null;

      if (atRest) {
        const offset = offsetPagesRef.current;
        const maxIdx = maxPageIndexRef.current;

        if ((offset <= 0.001 && direction < 0) || (offset >= maxIdx - 0.001 && direction > 0)) {
          // Already resting at this end of the shelf — don't consume the
          // event, so it bubbles up to the site-wide section navigator,
          // which can then jump to the previous/next section instead.
          return;
        }
      }

      event.preventDefault();
      event.stopPropagation();

      if (prefersReducedMotionRef.current) {
        const maxIdx = maxPageIndexRef.current;
        const target = Math.min(maxIdx, Math.max(0, Math.round(offsetPagesRef.current) + direction));
        offsetPagesRef.current = target;
        velocityRef.current = 0;
        applyScrollVisuals(target);
        setPageIndex(target);
        return;
      }

      velocityRef.current += event.deltaY * VELOCITY_SCALE;
      velocityRef.current = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityRef.current));
      startPhysicsLoop();
    }

    node.addEventListener("wheel", handleWheel, {passive: false});
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  const rangeStart = filteredProducts.length ? clampedStart + 1 : 0;
  const rangeEnd = Math.min(clampedStart + capacity, filteredProducts.length);
  const thumbLeftPct = (clampedPageIndex / pageCount) * 100;
  const thumbWidthPct = (1 / pageCount) * 100;

  // Dragging the progress pill scrubs the grid live — the same
  // applyScrollVisuals call the physics loop uses every frame, just driven
  // by pointer position instead of momentum, so the cards visibly track
  // the drag in real time. Any in-flight momentum is cancelled the moment
  // a drag starts so the two never fight over the position.
  function updateProgressDragPosition(clientX: number) {
    const track = progressTrackRef.current;
    if (!track) {
      return;
    }

    const box = track.getBoundingClientRect();
    const ratio = box.width > 0 ? (clientX - box.left) / box.width : 0;
    const offset = Math.min(1, Math.max(0, ratio)) * maxPageIndexRef.current;
    offsetPagesRef.current = offset;
    applyScrollVisuals(offset);
  }

  function handleProgressPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (maxPageIndexRef.current <= 0) {
      return;
    }

    stopPhysicsLoop();
    velocityRef.current = 0;
    draggingProgressRef.current = true;
    setIsProgressDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateProgressDragPosition(event.clientX);
  }

  function handleProgressPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingProgressRef.current) {
      return;
    }

    updateProgressDragPosition(event.clientX);
  }

  function handleProgressPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingProgressRef.current) {
      return;
    }

    draggingProgressRef.current = false;
    setIsProgressDragging(false);
    // See handleTabIndicatorPointerUp above: releasePointerCapture throws
    // if this pointer isn't actually captured, which would abort the rest
    // of this handler (including the snap-to-page logic below) and leave
    // the drag stuck.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const target = Math.min(maxPageIndexRef.current, Math.max(0, Math.round(offsetPagesRef.current)));
    offsetPagesRef.current = target;
    applyScrollVisuals(target);
    setPageIndex(target);
  }

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden bg-[#f7f4ee]">
      {/*
        Deliberately a plain div, not <ScrollSection> — this is embedded
        inside app/page.tsx's own ScrollSection (the "/catalogue" snap
        page), which is the only data-nav-href marker this block needs.
        Its own height already matches that outer .snap-page exactly
        (100dvh minus the header), so it fits flush with no extra scroll.
      */}
      <div className="flex h-full flex-col">
        {/*
          The tabs pill and the count/sort controls used to be two stacked
          shrink-0 rows, each eating its own slice of the fixed-height
          budget this grid has to fit "2 rows of cards" into — merging them
          into one row gets that vertical space back for the grid itself.
        */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#d9cfc0] px-6 py-3 sm:px-10">
          <div
            ref={tabsRef}
            className="liquid-glass-on-light relative flex w-max items-center gap-1 overflow-x-auto rounded-full p-1.5"
          >
            {tabIndicator
              ? (() => {
                  const lensLeft = tabDragLeft ?? tabIndicator.left;
                  const lensWidth = tabDragWidth ?? tabIndicator.width;

                  return (
                    <span
                      aria-hidden
                      onPointerDown={handleTabIndicatorPointerDown}
                      onPointerMove={handleTabIndicatorPointerMove}
                      onPointerUp={handleTabIndicatorPointerUp}
                      onPointerCancel={handleTabIndicatorPointerUp}
                      className={`liquid-glass-active top-1.5 h-[calc(100%-0.75rem)] ${
                        isTabDragging ? "is-dragging" : "cursor-grab active:cursor-grabbing"
                      }`}
                      style={{
                        left: lensLeft,
                        width: lensWidth,
                        pointerEvents: "auto",
                        touchAction: "none",
                        cursor: isTabDragging ? "grabbing" : "grab"
                      }}
                    />
                  );
                })()
              : null}
            {shopProductTypes.map((type) => {
              const Icon = productTypeIcons[type];
              // While the pill is being dragged, "active" (and therefore
              // light label text) follows whichever tab it's currently over
              // instead of the tab it started from, so the label under the
              // opaque pill always stays readable in real time rather than
              // only updating once the drag is dropped.
              const active = isTabDragging ? type === dragOverType : type === selectedProductType;
              // Distinct from `active`: this is the one tab whose button
              // actually received the pointerdown and holds pointer capture
              // for the whole gesture. Attaching the move/up handlers based
              // on `active` instead used to detach them mid-drag the moment
              // the pill was dragged onto a *different* tab (since `active`
              // follows dragOverType while dragging) — the browser kept
              // delivering the captured pointer events to this button, but
              // React no longer had a handler wired up to receive them, so
              // the drag would silently stop updating, reading as the pill
              // "freezing" or getting stuck. Handler attachment has to stay
              // pinned to the drag's origin tab for the gesture's duration.
              const isDragOrigin = type === selectedProductType;
              return (
                <button
                  key={type}
                  ref={(el) => {
                    if (el) {
                      tabRefs.current.set(type, el);
                    } else {
                      tabRefs.current.delete(type);
                    }
                  }}
                  type="button"
                  data-active={active}
                  onClick={() => selectProductType(type)}
                  // The active tab visually sits directly on top of the
                  // glass indicator (it's what makes it read as one pill),
                  // and its own z-10 means a pointerdown there hits this
                  // button, not the indicator span underneath — so the drag
                  // has to be initiated from here too when this is the tab
                  // currently holding the pill.
                  onPointerDown={isDragOrigin ? handleTabIndicatorPointerDown : undefined}
                  onPointerMove={isDragOrigin ? handleTabIndicatorPointerMove : undefined}
                  onPointerUp={isDragOrigin ? handleTabIndicatorPointerUp : undefined}
                  onPointerCancel={isDragOrigin ? handleTabIndicatorPointerUp : undefined}
                  className={`liquid-glass-link relative z-10 flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-[#4a4a3f] transition-colors duration-200 active:scale-95 ${
                    isDragOrigin ? (isTabDragging ? "cursor-grabbing" : "cursor-grab") : ""
                  }`}
                  style={isDragOrigin ? {touchAction: "none"} : undefined}
                >
                  <Icon className={`h-3.5 w-3.5 transition-colors duration-200 ${active ? "text-[#20241b]" : ""}`} />
                  <span className={`liquid-glass-label transition-colors duration-200 ${active ? "text-[#20241b]" : ""}`}>
                    {productTypeLabels[type][locale]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="liquid-glass-on-light flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#2e2e28] transition-transform duration-200 active:scale-95 lg:hidden"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </button>
            <p className="text-xs text-[#8a8a7a]">
              {filteredProducts.length ? `${rangeStart}–${rangeEnd}` : "0"} of {filteredProducts.length}
            </p>
            <div className="relative" ref={sortMenuRef}>
              <button
                type="button"
                onClick={() => setSortOpen((open) => !open)}
                className="liquid-glass-on-light flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[#2e2e28] transition-transform duration-200 active:scale-95"
              >
                <span className="text-[#6b6b5f]">Sort by:</span>
                <span className="font-medium">{sortOptions.find((option) => option.value === sort)?.label}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${sortOpen ? "rotate-180" : ""}`} />
              </button>

              {sortMenuMounted ? (
                <div
                  style={{transformOrigin: "top right"}}
                  className={`absolute right-0 top-11 z-20 w-52 rounded-2xl border border-[#d9cfc0] bg-[#f7f4ee] py-2 shadow-[0_16px_40px_rgba(46,46,40,0.14)] transition-all ${
                    sortMenuEntered
                      ? "translate-y-0 scale-100 opacity-100 duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                      : "translate-y-1 scale-[0.92] opacity-0 duration-100 ease-out"
                  }`}
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSort(option.value);
                        setSortOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors duration-150 hover:bg-[#eee7d8] ${
                        option.value === sort ? "font-medium text-[#344332]" : "text-[#4a4a3f]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div
            className="relative hidden shrink-0 overflow-hidden lg:block lg:h-full"
            style={{
              width: sidebarCollapsed ? "3rem" : "20%",
              transition: `width ${SIDEBAR_DURATION_MS}ms ${SIDEBAR_EASE}`
            }}
          >
            <button
              type="button"
              aria-label="Show filters"
              onClick={() => setSidebarCollapsed(false)}
              className={`liquid-glass-on-light absolute inset-0 flex flex-col items-center justify-center gap-4 text-[#8a8a7a] transition-opacity duration-300 hover:text-[#344332] ${
                sidebarCollapsed ? "pointer-events-auto opacity-100 delay-150" : "pointer-events-none opacity-0"
              }`}
            >
              <PanelLeftOpen className="h-4 w-4" />
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                style={{writingMode: "vertical-rl"}}
              >
                Filters
              </span>
            </button>

            <div
              className={`absolute inset-0 overflow-hidden bg-[#f2ecdc] shadow-[inset_-1px_0_0_rgba(217,207,192,0.7)] transition-opacity duration-200 lg:py-8 lg:pl-8 lg:pr-8 ${
                sidebarCollapsed ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100 delay-150"
              }`}
            >
              <FilterSidebar
                locale={locale}
                productType={selectedProductType}
                products={typeProducts}
                selectedMaterials={selectedMaterials}
                selectedSizes={selectedSizes}
                selectedShapes={selectedShapes}
                selectedHandles={selectedHandles}
                selectedGenders={selectedGenders}
                selectedAccessoryCategories={selectedAccessoryCategories}
                onToggleMaterial={toggleMaterial}
                onToggleSize={toggleSize}
                onToggleShape={toggleShape}
                onToggleHandle={toggleHandle}
                onToggleGender={toggleGender}
                onToggleAccessoryCategory={toggleAccessoryCategory}
                onCollapse={() => setSidebarCollapsed(true)}
              />
            </div>
          </div>

          {mobileFiltersMounted ? (
            <div
              data-scroll-lock
              className={`fixed inset-0 z-30 overflow-y-auto bg-[#f7f4ee] px-6 py-6 transition-all lg:hidden ${
                mobileFiltersEntered
                  ? "translate-y-0 opacity-100 duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  : "translate-y-4 opacity-0 duration-150 ease-in"
              }`}
            >
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setMobileFiltersOpen(false)}
                className="liquid-glass-on-light mb-4 flex h-9 w-9 items-center justify-center rounded-full text-[#2e2e28] transition-transform duration-200 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
              <FilterSidebar
                locale={locale}
                productType={selectedProductType}
                products={typeProducts}
                selectedMaterials={selectedMaterials}
                selectedSizes={selectedSizes}
                selectedShapes={selectedShapes}
                selectedHandles={selectedHandles}
                selectedGenders={selectedGenders}
                selectedAccessoryCategories={selectedAccessoryCategories}
                onToggleMaterial={toggleMaterial}
                onToggleSize={toggleSize}
                onToggleShape={toggleShape}
                onToggleHandle={toggleHandle}
                onToggleGender={toggleGender}
                onToggleAccessoryCategory={toggleAccessoryCategory}
              />
            </div>
          ) : null}

          <div ref={contentRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-hidden border-l border-t border-[#d9cfc0]">
              {filteredProducts.length ? (
                <div key="cards" ref={trackRef} className="flex h-full" style={{width: `${pageCount * 100}%`}}>
                  {Array.from({length: pageCount}).map((_, pageIdx) => (
                    <div
                      key={pageIdx}
                      className={`grid shrink-0 grid-cols-2 content-start ${columnClass}`}
                      style={{width: `${100 / pageCount}%`}}
                    >
                      {filteredProducts.slice(pageIdx * capacity, pageIdx * capacity + capacity).map((product) => (
                        <ShopProductCard key={product.slug} product={product} currency={currency} locale={locale} />
                      ))}
                    </div>
                  ))}
                </div>
              ) : typeProducts.length === 0 ? (
                <div key="coming-soon" className="flex h-full flex-col items-center justify-center gap-2 bg-white/60 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#9a9a8a]">
                    {productTypeLabels[selectedProductType][locale]}
                  </p>
                  <p className="font-display text-2xl text-[#4a4a3f]">Coming Soon</p>
                </div>
              ) : (
                <div key="no-matches" className="flex h-full items-center justify-center bg-white/60 text-center text-sm text-[#6b6b5f]">
                  No pieces match those filters yet. Try clearing a few.
                </div>
              )}
            </div>

            {maxPageIndex > 0 ? (
              <div className="flex shrink-0 items-center px-6 py-4 sm:px-10">
                <div
                  ref={progressTrackRef}
                  onPointerDown={handleProgressPointerDown}
                  onPointerMove={handleProgressPointerMove}
                  onPointerUp={handleProgressPointerUp}
                  onPointerCancel={handleProgressPointerUp}
                  className={`relative flex w-full items-center py-3 ${isProgressDragging ? "cursor-grabbing" : "cursor-grab"}`}
                  style={{touchAction: "none"}}
                >
                  <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-[#e4dfd2]">
                    <div
                      ref={thumbRef}
                      className="absolute inset-y-0 rounded-full bg-[#344332]"
                      style={{left: `${thumbLeftPct}%`, width: `${thumbWidthPct}%`}}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

