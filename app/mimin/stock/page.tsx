import {getServerSession} from "next-auth/next";
import {Warehouse} from "lucide-react";
import {authOptions} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
//
// No raw_materials/finished_stock/consignment_stock schema exists yet (the
// earlier stock-management task hasn't landed) — this page says so plainly
// rather than rendering fabricated stock numbers. Once that schema exists,
// this becomes the real Stock Overview: retail vs. consignment quantities,
// reorder thresholds, low/out-of-stock lists.
export default async function StockPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {email}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Stock &amp; Inventory</h1>
      </div>

      <div className="card flex flex-col items-center gap-3 p-10 text-center sm:p-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
          <Warehouse className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl text-forest-900">Inventory tracking isn&rsquo;t built yet</h2>
        <p className="max-w-md text-sm leading-6 text-forest-600">
          Raw materials, finished stock, and consignment tracking don&rsquo;t have a database schema yet, so this page
          can&rsquo;t honestly show any numbers. Product listings and their Visibility status are already live in{" "}
          <span className="font-medium text-forest-800">Manage Products</span> — stock levels and reorder thresholds will
          land here once that schema is built.
        </p>
      </div>
    </div>
  );
}
