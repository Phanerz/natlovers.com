import Link from "next/link";
import {PauseCircle} from "lucide-react";
import {CustomStudio} from "@/components/custom-studio/studio";
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
        <div className="shell py-24">
          <div className="mx-auto max-w-lg rounded-[2rem] border border-[#e0d8c7] bg-[#fffdf9] p-10 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100">
              <PauseCircle className="h-7 w-7 text-forest-700" />
            </span>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-500">Custom Studio</p>
            <h1 className="mt-2 font-display text-3xl leading-tight text-forest-900">Taking a short pause</h1>
            <p className="mt-3 text-sm leading-relaxed text-forest-600">{settings.customIntakePausedMessage}</p>
            {/* Drafts are untouched by the pause — nothing a customer has
                already designed is lost while intake is closed. */}
            <p className="mt-2 text-[12px] leading-relaxed text-forest-500">
              Anything you&apos;ve already designed is saved and will be here when we reopen.
            </p>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <Link
                href="/catalogue"
                className="button-lift rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-sand-50"
              >
                Browse the catalogue
              </Link>
              <Link href="/about" className="rounded-full border border-[#ddd5c4] px-6 py-3 text-sm font-medium text-forest-700">
                About the studio
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-enter">
      <CustomStudio basis={basis} catalogue={catalogue} initialDraft={draft} signedIn={Boolean(userId)} />
    </main>
  );
}
