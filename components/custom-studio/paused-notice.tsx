import Link from "next/link";
import {PauseCircle} from "lucide-react";

// Shown in place of the studio while the workshop has intake closed. Shared
// by the standalone /custom route and the homepage section so a pause reads
// identically wherever a customer meets it.
export function PausedNotice({message}: {message: string}) {
  return (
    <div className="shell py-16">
      <div className="mx-auto max-w-lg rounded-xl border border-[#e0d8c7] bg-[#fffdf9] p-10 text-center shadow-card">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100">
          <PauseCircle className="h-7 w-7 text-forest-700" />
        </span>
        <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-500">Custom Studio</p>
        <h2 className="mt-2 font-display text-3xl leading-tight text-forest-900">Taking a short pause</h2>
        <p className="mt-3 text-sm leading-relaxed text-forest-600">{message}</p>
        {/* Drafts are untouched by the pause  -  nothing a customer has already
            designed is lost while intake is closed. */}
        <p className="mt-2 text-[12px] leading-relaxed text-forest-500">
          Anything you&apos;ve already designed is saved and will be here when we reopen.
        </p>
        <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link href="/catalogue" className="button-lift rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-sand-50">
            Browse the catalogue
          </Link>
          <Link href="/about" className="rounded-full border border-[#ddd5c4] px-6 py-3 text-sm font-medium text-forest-700">
            About the studio
          </Link>
        </div>
      </div>
    </div>
  );
}
