"use client";

import Link from "next/link";
import {useEffect, useState} from "react";
import {DaisyLoader} from "@/components/daisy-loader";
import {OutletsPageContent} from "@/components/outlets/outlets-page-content";
import type {PublicLocation} from "@/lib/locations";

// The home page's Outlets section. Same deck + map as /outlets (embedded
// mode, so it lives inside the home page's own scroll snapping instead of
// locking the page), fed by the public /api/locations route because the home
// page is a client component.
export function OutletsContent() {
  const [locationList, setLocationList] = useState<PublicLocation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/locations")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("bad response"))))
      .then((data: PublicLocation[]) => {
        if (!cancelled) setLocationList(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (locationList && locationList.length > 0) {
    return <OutletsPageContent locationList={locationList} embedded />;
  }

  if (failed || (locationList && locationList.length === 0)) {
    return (
      <div className="shell flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 text-center">
        <p className="muted">Find Us</p>
        <p className="font-display text-2xl text-forest-900">Visit the studio, or find Natlovers near you.</p>
        <Link href="/outlets" className="text-sm underline underline-offset-4">
          See all locations
        </Link>
      </div>
    );
  }

  return <DaisyLoader layout="section" text="Finding our outlets..." />;
}
