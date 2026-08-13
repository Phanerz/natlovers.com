import {getServerSession} from "next-auth/next";
import {AdminSidebar} from "@/components/admin/admin-sidebar";
import {AdminSignIn} from "@/components/admin/admin-sign-in";
import {authOptions, isAdminEmail} from "@/lib/auth";

export const metadata = {
  robots: {index: false, follow: false}
};

// Single admin auth gate + the persistent sidebar shell for every /mimin/*
// route — previously only the dashboard tab itself rendered a sidebar, so
// navigating to Orders (or now Stock/Customers) dropped it entirely. Every
// admin page below this layout can assume it's already authenticated and
// just render its own content.
export default async function MiminLayout({children}: {children: React.ReactNode}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!isAdminEmail(email) || !email) {
    return (
      <main>
        <AdminSignIn />
      </main>
    );
  }

  return (
    <main className="shell py-10 sm:py-16">
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
