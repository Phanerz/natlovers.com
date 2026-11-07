"use client";

import {useEffect} from "react";

// Keeps the page from scrolling behind a pop-up. Several pop-ups can be open at once (a note over a
// dialog), so the lock is counted and only released when the last one closes.
//
// It is a class on <html> (see .scroll-locked in globals.css), not a style on <body>: the site sets
// an overflow value on <html> itself, and then the browser no longer passes <body>'s overflow up to
// the page, so locking <body> alone leaves the page scrollable.
let locks = 0;

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    document.documentElement.classList.add("scroll-locked");
    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) document.documentElement.classList.remove("scroll-locked");
    };
  }, [active]);
}
