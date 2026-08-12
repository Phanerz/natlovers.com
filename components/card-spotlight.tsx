"use client";

import {
  MouseEvent as ReactMouseEvent,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {createPortal} from "react-dom";

type SpotlightRect = {top: number; left: number; width: number; height: number};

type SpotlightState = {rect: SpotlightRect; token: number} | null;

type SpotlightContextValue = {
  // focus() returns the token for this hover session — the caller hangs on
  // to it and passes it back to blur() so a stale clear (from an element
  // that unmounted after a *different* element already took over focus)
  // can never clobber that newer hover. See useCardSpotlight's unmount
  // cleanup for why this matters.
  focus: (rect: SpotlightRect) => number;
  blur: (token: number) => void;
};

const SpotlightContext = createContext<SpotlightContextValue | null>(null);

// How far the fully-clear zone extends past the hovered element's own edges,
// and how wide the soft feathered falloff into full dimming is — together
// these are what read as "vignette" rather than a hard-edged cutout.
const HOLE_PADDING_PX = 18;
const FEATHER_PX = 64;

// Highest z-index anywhere else in the app is the toast at z-[60] — this
// sits comfortably above every existing menu/header/toast so the dimmed
// backdrop genuinely covers the whole site, not just the page content.
const OVERLAY_Z_INDEX = 500;

/**
 * A single, viewport-fixed dimming layer portalled straight to <body> — not
 * nested in the hovered card's own DOM subtree. That matters: several
 * ancestors in this app (the catalogue's momentum-scroll track, various
 * motion panels) apply inline `transform`, which per spec turns a
 * position:fixed descendant into something scoped to *that* ancestor's box
 * instead of the real viewport. Raising the hovered card's own z-index
 * above a nested overlay would silently break inside any such ancestor.
 * Portalling the overlay to <body> and cutting a mask-image "hole" at the
 * hovered element's live screen position sidesteps that entirely — nothing
 * about the hovered element itself needs to change.
 */
export function CardSpotlightProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<SpotlightState>(null);
  const [mounted, setMounted] = useState(false);
  const tokenSeedRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const focus = useCallback((rect: SpotlightRect) => {
    tokenSeedRef.current += 1;
    const token = tokenSeedRef.current;
    setState({rect, token});
    return token;
  }, []);

  const blur = useCallback((token: number) => {
    setState((current) => (current && current.token === token ? null : current));
  }, []);

  const value = useMemo(() => ({focus, blur}), [focus, blur]);

  const rect = state?.rect ?? null;
  const active = rect !== null;
  const centerX = rect ? rect.left + rect.width / 2 : 0;
  const centerY = rect ? rect.top + rect.height / 2 : 0;
  // An ellipse sized to the hovered element's own aspect ratio (plus the
  // padding/feather) so the clear zone hugs a wide card as closely as a
  // tall one, instead of a fixed-radius circle that either clips a wide
  // card's corners or leaves an oversized gap around a small element.
  const clearX = rect ? rect.width / 2 + HOLE_PADDING_PX : 0;
  const clearY = rect ? rect.height / 2 + HOLE_PADDING_PX : 0;
  const outerX = clearX + FEATHER_PX;
  const outerY = clearY + FEATHER_PX;
  // Percentage stops are the correct way to mark the clear/feather boundary
  // on an explicit-size ellipse gradient — the browser resolves "X%" to the
  // matching point on the ellipse's own contour in every direction, so a
  // single fraction still respects the element's aspect ratio. Pixel stops
  // don't have a well-defined meaning against a two-axis ellipse size.
  const clearFraction = rect ? (clearX / outerX + clearY / outerY) / 2 : 0;

  const maskImage = rect
    ? `radial-gradient(${outerX}px ${outerY}px at ${centerX}px ${centerY}px, transparent 0%, transparent ${(clearFraction * 100).toFixed(2)}%, black 100%)`
    : undefined;

  return (
    <SpotlightContext.Provider value={value}>
      {children}
      {mounted
        ? createPortal(
            <div
              aria-hidden
              className="pointer-events-none fixed inset-0 transition-opacity duration-300 ease-out"
              style={{
                zIndex: OVERLAY_Z_INDEX,
                opacity: active ? 1 : 0,
                backgroundColor: "rgba(6, 10, 8, 0.64)",
                backdropFilter: "blur(7px)",
                WebkitBackdropFilter: "blur(7px)",
                maskImage,
                WebkitMaskImage: maskImage,
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%"
              }}
            />,
            document.body
          )
        : null}
    </SpotlightContext.Provider>
  );
}

export function useCardSpotlight<T extends HTMLElement>() {
  const context = useContext(SpotlightContext);
  if (!context) {
    throw new Error("useCardSpotlight must be used within CardSpotlightProvider");
  }

  const activeTokenRef = useRef<number | null>(null);

  useEffect(() => {
    // Unmounting while still focused — navigating away by clicking the
    // card, a tab/filter change removing it from the DOM, pagination, etc.
    // — never fires a natural mouseleave, which would otherwise leave the
    // dimmed overlay stuck on whatever renders next. This is the safety
    // net: it always clears on unmount, but only *this* instance's token,
    // so it can never cancel a different card's legitimately newer hover.
    return () => {
      if (activeTokenRef.current !== null) {
        context.blur(activeTokenRef.current);
      }
    };
  }, [context]);

  function readRect(event: ReactMouseEvent<T>): SpotlightRect {
    const box = event.currentTarget.getBoundingClientRect();
    return {top: box.top, left: box.left, width: box.width, height: box.height};
  }

  return {
    // onMouseMove keeps the highlighted hole synced to the element's live
    // screen position if the page scrolls/paginates while still hovering
    // it (the catalogue's own wheel-driven paging can do exactly that),
    // rather than freezing wherever the cursor first entered.
    onMouseEnter: (event: ReactMouseEvent<T>) => {
      activeTokenRef.current = context.focus(readRect(event));
    },
    onMouseMove: (event: ReactMouseEvent<T>) => {
      activeTokenRef.current = context.focus(readRect(event));
    },
    onMouseLeave: () => {
      if (activeTokenRef.current !== null) {
        context.blur(activeTokenRef.current);
        activeTokenRef.current = null;
      }
    }
  };
}
