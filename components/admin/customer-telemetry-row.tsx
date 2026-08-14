import {Repeat, UserPlus, Users, UserCheck} from "lucide-react";
import {CustomerTelemetry} from "@/lib/customers";

// Same card shape as dashboard-home.tsx's StatCard (icon circle, uppercase
// label, font-display value, top-anchored content) — kept as its own small
// component here rather than importing that one, since this branch and the
// dashboard rebuild are separate worktrees right now.
function TelemetryCard({
  icon: Icon,
  label,
  value,
  subtext
}: {
  icon: typeof Users;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="flex min-h-[128px] flex-col items-start rounded-[1.4rem] border border-[#d4c5ab] bg-[#fffaf1] p-4 text-left">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eee4cd] text-forest-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase leading-tight tracking-[0.16em] text-forest-500">{label}</p>
      <p className="mt-1 font-display text-3xl text-forest-900">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-forest-500">{subtext}</p> : null}
    </div>
  );
}

export function CustomerTelemetryRow({telemetry}: {telemetry: CustomerTelemetry}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <TelemetryCard
        icon={Users}
        label="Total Customers"
        value={String(telemetry.totalCustomers)}
        subtext={`+${telemetry.newThisMonth} this month`}
      />
      <TelemetryCard icon={UserPlus} label="New Customers" value={String(telemetry.newThisMonth)} subtext="This calendar month" />
      <TelemetryCard
        icon={UserCheck}
        label="Returning Customers"
        value={String(telemetry.returningCustomers)}
        subtext="Ordered 2+ times"
      />
      <TelemetryCard
        icon={Repeat}
        label="Repeat Purchase Rate"
        value={`${telemetry.repeatPurchaseRate}%`}
        subtext="Customers who returned"
      />
    </div>
  );
}
