"use client";

import {AboutContent} from "@/components/about-content";
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

      {/* Custom has no homepage section: it is the Custom Studio, a full
          interactive workspace that belongs on its own route rather than
          inside a snap-scroll page. The nav item routes straight to
          /custom (see goToNavHref in components/header.tsx). */}
      <ScrollSection navHref="/outlets" className="snap-page">
        <OutletsContent />
      </ScrollSection>

      <ScrollSection navHref="/about" className="snap-page">
        <AboutContent />
      </ScrollSection>
    </main>
  );
}