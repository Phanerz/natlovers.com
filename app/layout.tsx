import "./globals.css";
import {ReactNode} from "react";
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
      <body>
        <SitePreferencesProvider>
          <StorefrontProvider>
            <Header />
            {children}
            <Footer />
          </StorefrontProvider>
        </SitePreferencesProvider>
      </body>
    </html>
  );
}
