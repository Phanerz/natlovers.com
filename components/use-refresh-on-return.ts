"use client";

import {useEffect, useState} from "react";

// Returns a number that goes up every time the customer comes back to this tab
// or window (window focus, or the tab becoming visible again). Put it in an
// effect's dependency list to refetch on return, so something an admin has
// deleted or changed while the page sat open disappears without a manual
// reload.
export function useRefreshOnReturn() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function bump() {
      if (document.visibilityState === "visible") {
        setTick((current) => current + 1);
      }
    }

    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);

  return tick;
}
