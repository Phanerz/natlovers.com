import {desc} from "drizzle-orm";
import {logFailure} from "@/lib/safe-log";
import {AtelierPanel} from "@/components/admin/atelier-panel";
import {limitChanges, db} from "@/lib/db";
import {jakartaMonth, monthName} from "@/lib/atelier-limits";
import {getLimits, getMonthlyUsage} from "@/lib/limits";
import {waitingListCount} from "@/lib/waiting-list";
import {getSession} from "@/lib/auth";

export const dynamic = "force-dynamic";

// Auth is already gated by app/mimin/layout.tsx.
export default async function AtelierPage() {
  const session = await getSession();
  const now = new Date();
  let setupError: string | null = null;
  let limits = await getLimits();
  let used = {PIECES: 0, ATELIER_EXTRAS: 0};
  let waiting = 0;
  let log: {id: string; setting: string; oldValue: string | null; newValue: string | null; changedByEmail: string; changedAt: string}[] = [];
  try {
    [limits, used, waiting] = await Promise.all([getLimits(), getMonthlyUsage(db, now), waitingListCount()]);
    const rows = await db.select().from(limitChanges).orderBy(desc(limitChanges.changedAt)).limit(100);
    log = rows.map((row) => ({...row, changedAt: row.changedAt.toISOString()}));
  } catch (error) {
    logFailure("Atelier page data unavailable", error);
    setupError = "The atelier tables are not in the database yet. Run the latest migration, then reload this page.";
  }
  const month = jakartaMonth(now);

  return (
    <div className="space-y-6">
      <div>
        <p className="muted">Admin, {session?.user?.email ?? ""}</p>
        <h1 className="mt-2 font-display text-3xl text-forest-900">Atelier</h1>
      </div>
      <AtelierPanel
        monthLabel={`${monthName(month.month, "en")} ${month.year}`}
        limits={limits}
        piecesUsed={used.PIECES}
        extrasUsed={used.ATELIER_EXTRAS}
        waitingCount={waiting}
        log={log}
        setupError={setupError}
      />
    </div>
  );
}
