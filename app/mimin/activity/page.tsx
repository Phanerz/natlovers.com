import {ActivityFeed} from "@/components/admin/activity-feed";
import {getVisitorCountries} from "@/lib/activity";
import {getSession} from "@/lib/auth";

// Auth is already gated by app/mimin/layout.tsx.
export const dynamic = "force-dynamic";

function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], {type: "region"}).of(code) ?? code;
  } catch {
    return code;
  }
}

export default async function ActivityPage() {
  const session = await getSession();
  const countries = await getVisitorCountries();
  const total = countries.reduce((sum, row) => sum + row.visits, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {session?.user?.email ?? ""}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Customer activity</h1>
        <p className="mt-1 text-sm text-forest-700">What customers have lately ordered, put in their bag, or liked. It refreshes by itself.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-xl text-forest-900">Recent activity</h2>
          <div className="mt-3">
            <ActivityFeed variant="page" limit={60} />
          </div>
        </section>

        <section className="card h-fit space-y-3 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl text-forest-900">Where new visitors come from</h2>
            <p className="mt-1 text-sm text-forest-600">
              Last 30 days. Counted once per new device, only for visitors who allowed Analytics in the cookie notice. No names or identifiers are kept.
            </p>
          </div>
          {countries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#d4c5ab] px-4 py-5 text-center text-sm text-forest-600">No visits recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {countries.map((row) => (
                <li key={row.country}>
                  <div className="flex items-baseline justify-between text-sm text-forest-900">
                    <span>{countryName(row.country)}</span>
                    <span className="text-forest-600">{row.visits}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full rounded-full bg-forest-700" style={{width: `${Math.max(4, (row.visits / total) * 100)}%`}} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
