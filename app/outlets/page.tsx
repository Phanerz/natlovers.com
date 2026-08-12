import {redirect} from "next/navigation";

// Outlets now lives as a section on the home page, not a standalone route —
// this exists only so old links/bookmarks to /outlets still land somewhere
// sensible.
export default function OutletsPage() {
  redirect("/");
}
