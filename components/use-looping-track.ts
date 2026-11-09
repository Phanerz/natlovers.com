"use client";

import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";

// A swipeable row that never ends: from the last slide a swipe left arrives at the first, and from the
// first a swipe right arrives at the last. The row is a plain native scroll-snap strip (so it keeps the
// phone's own swipe feel); once the visitor's browser has loaded it, a copy of the last slide is placed
// before the first and a copy of the first after the last. When a swipe comes to rest on a copy, the
// strip jumps, unseen, to the identical real slide.
//
// `loop` is false until the page has loaded (the server-rendered strip is the plain one, so the first
// photograph is what paints first). Render `loop ? [last, ...slides, first] : slides`, and use
// `onIndexChange` for dots or anything else that follows the real slide.
export function useLoopingTrack(count: number, onIndexChange: (index: number) => void, enabled = true) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const loop = enabled && ready && count > 1;
  const realRef = useRef(0);
  const settleTimer = useRef<number | null>(null);
  const touching = useRef(false);
  const onIndexRef = useRef(onIndexChange);
  onIndexRef.current = onIndexChange;

  useEffect(() => setReady(true), []);

  const jump = useCallback((left: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.scrollSnapType = "none";
    track.scrollLeft = left;
    window.setTimeout(() => {
      if (trackRef.current) trackRef.current.style.scrollSnapType = "";
    }, 60);
  }, []);

  const settle = useCallback(() => {
    const track = trackRef.current;
    if (!track || !loop || touching.current || drag.current?.moved) return;
    const width = track.clientWidth;
    if (!width) return;
    const raw = Math.round(track.scrollLeft / width);
    if (raw <= 0) jump(count * width);
    else if (raw >= count + 1) jump(width);
  }, [count, jump, loop]);

  // Put the strip on the first real slide as soon as the copies are in place, before anything paints.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    realRef.current = 0;
    onIndexRef.current(0);
    if (loop) jump(track.clientWidth);
  }, [count, jump, loop]);

  // Keep the same slide in view when the width changes (a phone turned on its side).
  useEffect(() => {
    if (!loop) return;
    const onResize = () => {
      const track = trackRef.current;
      if (track) jump((realRef.current + 1) * track.clientWidth);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [jump, loop]);

  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    },
    []
  );

  const queueSettle = useCallback(() => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(settle, 90);
  }, [settle]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const width = Math.max(1, track.clientWidth);
    const raw = Math.round(track.scrollLeft / width);
    const real = loop ? (((raw - 1) % count) + count) % count : Math.min(count - 1, Math.max(0, raw));
    if (real !== realRef.current) {
      realRef.current = real;
      onIndexRef.current(real);
    }
    if (loop) queueSettle();
  }, [count, loop, queueSettle]);

  // While a finger is down the strip is left alone; it settles once the finger lifts.
  const touchHandlers = {
    onTouchStart: () => {
      touching.current = true;
    },
    onTouchEnd: () => {
      touching.current = false;
      queueSettle();
    },
    onTouchCancel: () => {
      touching.current = false;
      queueSettle();
    }
  };

  // Laptop and desktop browsers in the phone layout: the strip can be dragged with the mouse, then it
  // eases to the picture it was dragged towards. A drag never counts as a click on what is inside.
  const drag = useRef<{x: number; left: number; moved: boolean; id: number} | null>(null);
  const suppressClick = useRef(false);
  const dragHandlers = {
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      if (!track || !loop || event.pointerType !== "mouse" || event.button !== 0) return;
      drag.current = {x: event.clientX, left: track.scrollLeft, moved: false, id: event.pointerId};
    },
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => {
      const track = trackRef.current;
      const state = drag.current;
      if (!track || !state) return;
      const delta = event.clientX - state.x;
      if (!state.moved && Math.abs(delta) > 5) {
        state.moved = true;
        track.style.scrollSnapType = "none";
        track.style.cursor = "grabbing";
        try {
          track.setPointerCapture(state.id);
        } catch {
          // Capture only keeps the drag going outside the strip.
        }
      }
      if (state.moved) track.scrollLeft = state.left - delta;
    },
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => endDrag(event.clientX),
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => endDrag(event.clientX),
    onClickCapture: (event: React.MouseEvent) => {
      if (suppressClick.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
  };
  function endDrag(clientX: number) {
    const track = trackRef.current;
    const state = drag.current;
    drag.current = null;
    if (!track || !state || !state.moved) return;
    const width = Math.max(1, track.clientWidth);
    const delta = clientX - state.x;
    const start = Math.round(state.left / width);
    const target = start + (delta < -40 ? 1 : delta > 40 ? -1 : 0);
    track.style.scrollSnapType = "";
    track.style.cursor = "";
    try {
      track.releasePointerCapture(state.id);
    } catch {
      // Already released.
    }
    track.scrollTo({left: target * width, behavior: "smooth"});
    suppressClick.current = true;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    queueSettle();
  }

  // Slide forward by one, wrapping round from the last to the first.
  const next = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const width = Math.max(1, track.clientWidth);
    const raw = Math.round(track.scrollLeft / width);
    const target = loop ? raw + 1 : (raw + 1) % count;
    track.scrollTo({left: target * width, behavior: "smooth"});
  }, [count, loop]);

  // Show a given real slide without animation (used when something else changed the picture).
  const showInstantly = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      jump((loop ? index + 1 : index) * track.clientWidth);
    },
    [jump, loop]
  );

  return {trackRef, loop, onScroll, touchHandlers, dragHandlers, next, showInstantly};
}
