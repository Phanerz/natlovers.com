import {redirect} from "next/navigation";

// Custom now lives as a section on the home page, not a standalone route —
// this exists only so old links/bookmarks to /custom still land somewhere
// sensible.
export default function CustomPage() {
  redirect("/");
}
