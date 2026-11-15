import "./globals.css";
// Fonts come from npm and are served by this site: nothing is fetched from Google at build or run time.
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cormorant-garamond/latin-500.css";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/cormorant-garamond/latin-400-italic.css";
import "@fontsource/cormorant-garamond/latin-500-italic.css";
import "@fontsource/hanken-grotesk/latin-400.css";
import "@fontsource/hanken-grotesk/latin-500.css";
import "@fontsource/hanken-grotesk/latin-600.css";
import {ReactNode} from "react";
import {AuthSessionProvider} from "@/components/auth-session-provider";
import {CookieConsent} from "@/components/cookie-consent";
import {ErrorBoundary} from "@/components/error-boundary";
import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
import {HeaderFallback} from "@/components/header-fallback";
import {SitePreferencesProvider} from "@/components/site-preferences-provider";
import {StorefrontProvider} from "@/components/storefront-provider";
import {ThemeProvider} from "@/components/theme-provider";

export const metadata = {
  title: "Natlovers",
  description: "Indonesian artisan handbags and decorative craft objects."
};

// Applies the saved theme class before React hydrates, so a dark-mode
// visitor never sees a flash of the light theme on first paint. Reads
// localStorage directly rather than waiting on ThemeProvider, which only
// runs after hydration.
const themeInitScript = `(function(){try{var t=localStorage.getItem('nl-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');}if(/Instagram/i.test(navigator.userAgent)){document.documentElement.classList.add('ig-browser');}}catch(e){}})();`;

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html: themeInitScript}} />
      </head>
      <body suppressHydrationWarning>
        <div aria-hidden className="site-background" />
        <ThemeProvider>
          <AuthSessionProvider>
            <SitePreferencesProvider>
              <StorefrontProvider>
                {/* Header and Footer render outside {children}, so Next's
                    app/error.tsx (which only wraps route-segment content)
                    never covers them  -  a crash in either would otherwise fall
                    through to app/global-error.tsx and tear down the whole
                    app shell (auth/cart/locale state included) instead of
                    just that one region. */}
                <ErrorBoundary fallback={<HeaderFallback />}>
                  <Header />
                </ErrorBoundary>
                {children}
                <ErrorBoundary fallback={null}>
                  <Footer />
                </ErrorBoundary>
                {/* The cookie notice and location check: shown once per new device. */}
                <ErrorBoundary fallback={null}>
                  <CookieConsent />
                </ErrorBoundary>
              </StorefrontProvider>
            </SitePreferencesProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
