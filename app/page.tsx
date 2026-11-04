"use client";

import {Suspense} from "react";
import {AboutContent} from "@/components/about-content";
import {CustomStudioSection} from "@/components/custom-studio/studio-section";
import {Hero} from "@/components/hero";
import {OutletsContent} from "@/components/outlets-content";
import {ScrollSection} from "@/components/scroll-section";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {CatalogueContent} from "@/app/catalogue/CatalogueClient";

export default function HomePage() {
  const {locale, currency} = useSitePreferences();

  return (
    <main className="home-main">
      <ScrollSection navHref="/" className="snap-page snap-page--hero">
        <Hero locale={locale} currency={currency} />
      </ScrollSection>

      <ScrollSection navHref="/catalogue" className="snap-page">
        <Suspense fallback={null}>
          <CatalogueContent />
        </Suspense>
      </ScrollSection>

      {/* On phones and tablets Custom Studio stays its own page (via the menu), not a section of the home scroll. */}
      <ScrollSection navHref="/custom" className="snap-page max-lg:hidden">
        <CustomStudioSection />
      </ScrollSection>

      <ScrollSection navHref="/outlets" className="snap-page">
        <OutletsContent />
      </ScrollSection>

      <ScrollSection navHref="/about" className="snap-page">
        <AboutContent />
      </ScrollSection>
    </main>
  );
}