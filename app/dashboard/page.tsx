import {dashboardSummary} from "@/lib/data";

export default function DashboardPage() {
  return (
    <main className="shell py-16 space-y-8">
      <div>
        <p className="muted">Customer Dashboard</p>
        <h1 className="mt-3 font-display text-4xl text-forest-900">Welcome back to your collection.</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          ["Upcoming orders", dashboardSummary.upcomingOrders],
          ["Saved pieces", dashboardSummary.savedPieces],
          ["Custom requests", dashboardSummary.customRequests]
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-6">
            <p className="muted">{label}</p>
            <p className="mt-4 font-display text-5xl text-forest-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="card p-6">
        <p className="font-display text-2xl text-forest-900">Recent orders</p>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-forest-700">
            <thead className="text-xs uppercase tracking-[0.24em] text-forest-500">
              <tr>
                <th className="pb-3">Order</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-forest-100">
                <td className="py-4">NAT-2026-0001</td>
                <td className="py-4">Processing</td>
                <td className="py-4">Bank transfer</td>
                <td className="py-4">$325.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
