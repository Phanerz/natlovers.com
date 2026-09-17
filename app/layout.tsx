import "./globals.css";
import {ReactNode} from "react";
import {AuthSessionProvider} from "@/components/auth-session-provider";
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
const themeInitScript = `(function(){try{var t=localStorage.getItem('nl-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

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
              </StorefrontProvider>
            </SitePreferencesProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
