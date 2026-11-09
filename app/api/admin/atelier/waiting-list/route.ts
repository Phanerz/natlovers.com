import {getSession, isAdminEmail} from "@/lib/auth";
import {waitingListRows} from "@/lib/waiting-list";

export const dynamic = "force-dynamic";

function csvCell(value: string | null) {
  const text = value ?? "";
  // Guard against spreadsheet formula injection as well as quoting.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

// CSV export of the waiting list, admin only.
export async function GET() {
  const session = await getSession();
  if (!isAdminEmail(session?.user?.email)) {
    return new Response("Unauthorized.", {status: 401});
  }
  const rows = await waitingListRows();
  const lines = [
    ["email", "language", "joined", "notified", "unsubscribed"].join(","),
    ...rows.map((row) =>
      [
        csvCell(row.email),
        csvCell(row.language),
        csvCell(row.createdAt.toISOString()),
        csvCell(row.notifiedAt?.toISOString() ?? ""),
        csvCell(row.unsubscribedAt?.toISOString() ?? "")
      ].join(",")
    )
  ];
  return new Response(lines.join("\r\n"), {
    headers: {"Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="waiting-list.csv"'}
  });
}
