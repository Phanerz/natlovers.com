"use client";

import {useCallback, useEffect, useState} from "react";
import {usePathname, useRouter} from "next/navigation";
import {useSession} from "next-auth/react";

// Every product card calls this hook, so a catalogue page used to ask for the same wishlist once per card.
// One request is shared between them for a few seconds, and dropped whenever the wishlist changes.
let shared: Promise<string[]> | null = null;
let sharedAt = 0;
function loadWishlist(): Promise<string[]> {
  const now = Date.now();
  if (shared && now - sharedAt < 3000) return shared;
  sharedAt = now;
  shared = fetch("/api/wishlist", {cache: "no-store"})
    .then((response) => (response.ok ? response.json() : {slugs: []}))
    .then((data: {slugs: string[]}) => (Array.isArray(data.slugs) ? data.slugs : []))
    .catch(() => {
      shared = null;
      return [];
    });
  return shared;
}

export function useWishlist() {
  const {status} = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [slugs, setSlugs] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status !== "authenticated") {
      setSlugs(new Set());
      setLoaded(true);
      return;
    }
    let cancelled = false;
    loadWishlist()
      .then((list) => {
        if (!cancelled) {
          setSlugs(new Set(list));
        }
      })
      .catch(() => {
        // A network failure here just means the wishlist stays empty for
        // this load  -  .finally() below still flips `loaded` either way, so
        // this only exists to stop the rejection from going unhandled.
      })
      .finally(() => {
        if (!cancelled) {
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const toggle = useCallback(
    async (slug: string) => {
      if (status !== "authenticated") {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`);
        return;
      }

      shared = null;
      const wasWishlisted = slugs.has(slug);
      setSlugs((current) => {
        const next = new Set(current);
        if (wasWishlisted) {
          next.delete(slug);
        } else {
          next.add(slug);
        }
        return next;
      });

      try {
        const response = await fetch("/api/wishlist", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({slug})
        });
        if (!response.ok) {
          throw new Error("Wishlist toggle failed.");
        }
      } catch {
        // Roll back the optimistic update if the request didn't land.
        setSlugs((current) => {
          const next = new Set(current);
          if (wasWishlisted) {
            next.add(slug);
          } else {
            next.delete(slug);
          }
          return next;
        });
      }
    },
    [slugs, status, router, pathname]
  );

  const isWishlisted = useCallback((slug: string) => slugs.has(slug), [slugs]);

  return {isWishlisted, toggle, loaded, signedIn: status === "authenticated"};
}
