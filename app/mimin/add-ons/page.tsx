import {AddonsAdmin} from "@/components/admin/addons-admin";
import {getSession} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
export default async function AddonsPage() {
  const session = await getSession();
  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {session?.user?.email ?? ""}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Add-ons</h1>
        <p className="mt-1 text-sm text-forest-700">
          The felted animals customers can attach to a bag. Only bags with Personalisation switched on offer them.
        </p>
      </div>
      <AddonsAdmin />
    </div>
  );
}
