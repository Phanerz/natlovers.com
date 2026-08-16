import {CustomStudio} from "@/components/custom-studio/studio";
import {PausedNotice} from "@/components/custom-studio/paused-notice";
import {getSession} from "@/lib/auth";
import {getDraft, getStudioCatalogueData} from "@/lib/custom-requests";
import {getStoreSettings} from "@/lib/store-settings";

// Every input the studio needs is read live: catalogue prices anchor the
// estimate, catalogue photographs feed the preview, and the intake pause is
// checked here as well as on submit.
export const dynamic = "force-dynamic";

export default async function CustomPage() {
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const [settings, {basis, catalogue}, draft] = await Promise.all([
    getStoreSettings(),
    getStudioCatalogueData(),
    userId ? getDraft(userId) : Promise.resolve(null)
  ]);

  if (settings.customIntakePaused) {
    return (
      <main className="page-enter">
        <PausedNotice message={settings.customIntakePausedMessage} />
      </main>
    );
  }

  return (
    <main className="page-enter">
      <CustomStudio basis={basis} catalogue={catalogue} initialDraft={draft} signedIn={Boolean(userId)} />
    </main>
  );
}
