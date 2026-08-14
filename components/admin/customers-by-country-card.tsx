import {Globe2} from "lucide-react";
import type {CustomersByCountryRow} from "@/lib/customers";

export function CustomersByCountryCard({rows}: {rows: CustomersByCountryRow[]}) {
  return (
    <div className="card space-y-4 p-6 sm:p-8">
      <h2 className="font-display text-xl text-forest-900">Customers by location</h2>
      {rows.length ? (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.country ?? "unassigned"}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[#e7ddc6] bg-[#fffdf9] px-4 py-3"
            >
              <span className="flex items-center gap-3 text-sm text-forest-800">
                <Globe2 className={`h-4 w-4 ${row.country ? "text-forest-500" : "text-forest-400"}`} />
                {row.country ?? <span className="text-forest-500">Unassigned location</span>}
              </span>
              <span className="shrink-0 text-sm text-forest-700">
                <span className="font-semibold text-forest-900">{row.count}</span>{" "}
                <span className="text-forest-500">({row.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-forest-500">No customers yet.</p>
      )}
    </div>
  );
}
