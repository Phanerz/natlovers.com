import "./globals.css";
import {ReactNode} from "react";
import {AuthSessionProvider} from "@/components/auth-session-provider";
import {ErrorBoundary} from "@/components/error-boundary";
import {Footer} from "@/components/footer";
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
        <AuthSessionProvider>
          <SitePreferencesProvider>
            <StorefrontProvider>
              {/* Header and Footer render outside {children}, so Next's
                  app/error.tsx (which only wraps route-segment content)
                  never covers them — a crash in either would otherwise fall
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
      </body>
    </html>
  );
}
