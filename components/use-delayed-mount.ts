"use client";

import {useEffect, useRef, useState} from "react";

// Keeps a component mounted through its exit transition instead of
// hard-unmounting the instant `open` flips false: entering sets `mounted`
// immediately and flips `entered` true one frame later (so the initial
// hidden style actually paints before transitioning  -  a node can't
// transition from a style it was never rendered with). Closing drops
// `entered` right away to start the exit transition, then unmounts once
// it's had time to finish. A fast re-open cancels the pending unmount and
// reverses cleanly since CSS transitions can reverse mid-flight.
export function useDelayedMount(open: boolean, exitMs = 150) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      // A single rAF here isn't reliable: this effect runs inside React's
      // commit, and the browser can still fold the "just mounted, not
      // entered" style and the rAF's "entered" style into the very same
      // paint  -  so the element's first-ever paint already has the open
      // styles, and CSS transitions never fire (there's no earlier painted
      // frame to animate from). Nesting a second rAF forces one full frame
      // to actually get painted with the closed styles first, so the
      // subsequent flip to entered has something to transition from.
      let innerRaf = 0;
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => setEntered(true));
      });
      return () => {
        cancelAnimationFrame(outerRaf);
        cancelAnimationFrame(innerRaf);
      };
    }

    setEntered(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      closeTimerRef.current = null;
    }, exitMs);
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, exitMs]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    },
    []
  );

  return {mounted, entered};
}
