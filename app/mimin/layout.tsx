import {AdminSidebar} from "@/components/admin/admin-sidebar";
import {AdminSignIn} from "@/components/admin/admin-sign-in";
import {getSession, isAdminEmail} from "@/lib/auth";

export const metadata = {
  robots: {index: false, follow: false}
};

// Single admin auth gate + the persistent sidebar shell for every /mimin/*
// route  -  previously only the dashboard tab itself rendered a sidebar, so
// navigating to Orders (or now Stock/Customers) dropped it entirely. Every
// admin page below this layout can assume it's already authenticated and
// just render its own content.
export default async function MiminLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  const email = session?.user?.email;

  if (!isAdminEmail(email) || !email) {
    return (
      <main>
        <AdminSignIn />
      </main>
    );
  }

  // Wider than the storefront's shared .shell (max-w-7xl)  -  the admin panel
  // benefits from using more of a wide monitor, unlike storefront copy/imagery
  // which reads worse stretched out. Scoped to this layout (not .shell itself)
  // so every /mimin/* page gets it consistently without touching the public
  // site. Still capped, not unbounded, so a 4K/ultrawide display doesn't
  // stretch the grid absurdly thin.
  return (
    <main className="mx-auto w-full max-w-[1800px] px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
