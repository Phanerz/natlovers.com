import {redirect} from "next/navigation";

// About now lives as a section on the home page, not a standalone route —
// this exists only so old links/bookmarks to /about still land somewhere
// sensible.
export default function AboutPage() {
  redirect("/");
}
