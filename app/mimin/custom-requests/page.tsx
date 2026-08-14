import {CustomRequestsPanel} from "@/components/admin/custom-requests-panel";
import {getSession} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
export default async function AdminCustomRequestsPage() {
  const session = await getSession();
  const email = session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Custom Studio</h1>
      </div>

      <CustomRequestsPanel />
    </div>
  );
}
