"use client";

import {RefObject, useEffect, useRef} from "react";

// Listens on pointerdown (fires before the trigger button's own click, so
// toggling a dropdown open never double-fires: the button lives inside
// `ref`, so a pointerdown on it isn't "outside" and only its own onClick
// runs). The callback is kept in a ref so the listener doesn't need to be
// torn down and re-added every render just because the caller passed a
// fresh inline function.
export function useClickOutside(ref: RefObject<HTMLElement | null>, onOutsideClick: () => void, active: boolean) {
  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;

  useEffect(() => {
    if (!active) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callbackRef.current();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, active]);
}
