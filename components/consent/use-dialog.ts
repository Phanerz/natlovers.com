"use client";

import {RefObject, useEffect, useRef} from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// What a modal dialog needs to be usable without a mouse: focus moves into it when it opens, Tab
// stays inside it, Escape closes it, the page behind does not scroll, and focus goes back to
// where it was when it closes.
export function useDialog(open: boolean, containerRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.offsetParent !== null);
    // Focus the dialog's first control a moment after it appears, once it is laid out.
    const frame = window.requestAnimationFrame(() => (focusables()[0] ?? container).focus());

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !container?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, containerRef]);
}
