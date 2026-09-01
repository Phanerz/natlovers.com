import "./globals.css";
import {ReactNode} from "react";
import {AuthSessionProvider} from "@/components/auth-session-provider";
import {ErrorBoundary} from "@/components/error-boundary";
import {Header} from "@/components/header";
import {HeaderFallback} from "@/components/header-fallback";
import {SitePreferencesProvider} from "@/components/site-preferences-provider";
import {StorefrontProvider} from "@/components/storefront-provider";

export const metadata = {
  title: "Natlovers",
  description: "Indonesian artisan handbags and decorative craft objects."
};

export default function RootLayout({children}: {children: ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div aria-hidden className="site-background" />
        <AuthSessionProvider>
          <SitePreferencesProvider>
            <StorefrontProvider>
              {/* Header renders outside {children}, so Next's app/error.tsx
                  (which only wraps route-segment content) never covers it  -
                  a crash here would otherwise fall through to
                  app/global-error.tsx and tear down the whole app shell
                  (auth/cart/locale state included) instead of just this
                  region.

                  Footer is intentionally not rendered  -  the component
                  still exists at components/footer.tsx, Phanuel wants it
                  reintroduced in a specific spot later, this is a "stop
                  rendering it" change, not a deletion. */}
              <ErrorBoundary fallback={<HeaderFallback />}>
                <Header />
              </ErrorBoundary>
              {children}
            </StorefrontProvider>
          </SitePreferencesProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
