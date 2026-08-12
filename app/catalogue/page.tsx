import {redirect} from "next/navigation";

// The catalogue now lives as a section on the home page, not a standalone
// route — this exists only so old links/bookmarks to /catalogue still land
// somewhere sensible.
export default function Page() {
  redirect("/");
}
