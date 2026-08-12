"use client";

import {AboutContent} from "@/components/about-content";
import {CustomContent} from "@/components/custom-content";
import {Hero} from "@/components/hero";
import {OutletsContent} from "@/components/outlets-content";
import {ScrollSection} from "@/components/scroll-section";
import {useSitePreferences} from "@/components/site-preferences-provider";
import {CatalogueContent} from "@/app/catalogue/CatalogueClient";

export default function HomePage() {
  const {locale, currency} = useSitePreferences();

  return (
    <main>
      <ScrollSection navHref="/" className="snap-page">
        <Hero locale={locale} currency={currency} />
      </ScrollSection>

      <ScrollSection navHref="/catalogue" className="snap-page">
        <CatalogueContent />
      </ScrollSection>

      <ScrollSection navHref="/custom" className="snap-page">
        <CustomContent />
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