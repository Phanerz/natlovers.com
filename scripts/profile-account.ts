import {eq} from "drizzle-orm";
import {db, users} from "../lib/db";
import {getAccountProfile} from "../lib/account";
import {getCustomerTelemetry} from "../lib/customers";
import {getDashboardStats} from "../lib/dashboard-stats";
import {getAddressesForUser} from "../lib/addresses";

async function time<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  console.log(`${label}: ${(performance.now() - start).toFixed(0)}ms`);
  return result;
}

async function main() {
  const [admin] = await db.select().from(users).where(eq(users.email, "phanuel2007@gmail.com"));
  if (!admin) {
    console.error("Admin user not found for phanuel2007@gmail.com");
    process.exit(1);
  }
  const userId = admin.id;
  console.log(`Profiling as ${admin.email} (${userId})\n`);

  console.log("--- Isolated timing per function (one at a time, no contention) ---");
  await time("getAccountProfile", () => getAccountProfile(userId));
  await time("getCustomerTelemetry", () => getCustomerTelemetry());
  await time("getDashboardStats('all')", () => getDashboardStats("all"));
  await time("getAddressesForUser", () => getAddressesForUser(userId));

  console.log("\n--- Real /api/account handler shape (sequential internally, per app/api/account/route.ts) ---");
  await time("full /api/account sequence", async () => {
    await getAccountProfile(userId);
    await getCustomerTelemetry();
    await getDashboardStats("all");
  });

  console.log("\n--- Realistic page load: /api/account handler run CONCURRENTLY with /api/account/addresses ---");
  console.log("(this is what the browser actually does — two separate fetches firing at once on page mount)");
  const concurrentStart = performance.now();
  await Promise.all([
    time("  [concurrent] /api/account sequence", async () => {
      await getAccountProfile(userId);
      await getCustomerTelemetry();
      await getDashboardStats("all");
    }),
    time("  [concurrent] /api/account/addresses", () => getAddressesForUser(userId))
  ]);
  console.log(`  [concurrent] TOTAL wall time: ${(performance.now() - concurrentStart).toFixed(0)}ms`);

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
