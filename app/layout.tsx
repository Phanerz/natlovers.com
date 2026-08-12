import "./globals.css";
import {ReactNode} from "react";
import {AuthSessionProvider} from "@/components/auth-session-provider";
import {CardSpotlightProvider} from "@/components/card-spotlight";
import {Footer} from "@/components/footer";
import {Header} from "@/components/header";
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
              <CardSpotlightProvider>
                <Header />
                {children}
                <Footer />
              </CardSpotlightProvider>
            </StorefrontProvider>
          </SitePreferencesProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
