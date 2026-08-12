import {getServerSession} from "next-auth/next";
import {AdminDashboard} from "@/components/admin/admin-dashboard";
import {AdminSignIn} from "@/components/admin/admin-sign-in";
import {authOptions, isAdminEmail} from "@/lib/auth";

export const metadata = {
  robots: {index: false, follow: false}
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  // signIn's callback already enforces the allowlist, so a session existing
  // at all implies an allowed email — this second check is just cheap
  // defense in depth against a stale/forged session outliving a since
  // removed ADMIN_EMAILS entry.
  const authed = isAdminEmail(email);

  if (authed && email) {
    return (
      <main className="shell py-16">
        <AdminDashboard userEmail={email} />
      </main>
    );
  }

  return (
    <main>
      <AdminSignIn />
    </main>
  );
}
