import Link from "next/link";
import type {Route} from "next";
import type {ReactNode} from "react";
import {LEGAL, LEGAL_LINKS} from "@/lib/legal";

export type LegalSection = {heading: string; body: ReactNode};

// The shared frame for Terms, Returns & Shipping and the Privacy Policy: one calm,
// readable column in the editorial width, a serif title, numbered sections, and links
// to the other two pages at the foot.
export function LegalPage({
  title,
  intro,
  sections,
  current
}: {
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  current: (typeof LEGAL_LINKS)[number]["href"];
}) {
  return (
    <main className="page-enter shell py-14 sm:py-20">
      <article className="mx-auto max-w-[680px]">
        <p className="muted">{LEGAL.brand}</p>
        <h1 className="mt-3 font-display text-4xl text-forest-900 sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-forest-600">Last updated {LEGAL.updated}</p>
        <div className="mt-6 space-y-3 text-lg leading-8 text-forest-800">{intro}</div>

        <div className="mt-12 space-y-10">
          {sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`legal-${index}`}>
              <h2 id={`legal-${index}`} className="font-display text-2xl text-forest-900">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-7 text-forest-800 [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
                {section.body}
              </div>
            </section>
          ))}
        </div>

        <nav aria-label="Other policies" className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-forest-100/70 pt-6 text-sm text-forest-700">
          {LEGAL_LINKS.filter((link) => link.href !== current).map((link) => (
            <Link key={link.href} href={link.href as Route} className="underline hover:text-forest-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </article>
    </main>
  );
}
