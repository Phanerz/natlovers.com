import {NextResponse} from "next/server";
import {getSession} from "@/lib/auth";
import {getDraft, getStudioCatalogueData} from "@/lib/custom-requests";
import {getStoreSettings} from "@/lib/store-settings";

// Everything the Custom Studio needs to boot, in one request.
//
// /custom renders the studio as a server component and never calls this. It
// exists for the homepage, which is a client component (it reads locale and
// currency from context), so the Custom section there cannot fetch pricing
// and catalogue data during render the way the standalone route does.
// Same data, same functions — the section is the real studio, not a copy.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const [settings, {basis, catalogue}, draft] = await Promise.all([
    getStoreSettings(),
    getStudioCatalogueData(),
    userId ? getDraft(userId) : Promise.resolve(null)
  ]);

  return NextResponse.json({
    basis,
    catalogue,
    draft,
    signedIn: Boolean(userId),
    paused: settings.customIntakePaused,
    pausedMessage: settings.customIntakePausedMessage
  });
}
