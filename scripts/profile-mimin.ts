import {getBestSellingProducts, getDashboardStats, getRecentOrders, getSalesSeries, getSidebarBadgeCounts} from "../lib/dashboard-stats";

// Mirrors exactly what one /mimin page load fires: AdminSidebar's own
// useEffect fetch (now the lightweight sidebar-badges path) running
// concurrently with DashboardHome's fetch, which itself hits
// /api/admin/dashboard-stats's sequential internal chain (getDashboardStats
// -> getSalesSeries -> getRecentOrders -> getBestSellingProducts, per that
// route's own deliberate sequencing).
async function simulateMiminPageLoad(tabLabel: string) {
  const start = performance.now();
  await Promise.all([
    getSidebarBadgeCounts(),
    (async () => {
      await getDashboardStats("all");
      await getSalesSeries("all");
      await getRecentOrders(5);
      await getBestSellingProducts(5);
    })()
  ]);
  const ms = performance.now() - start;
  console.log(`${tabLabel}: ${ms.toFixed(0)}ms`);
  return ms;
}

async function main() {
  console.log("--- Simulating 4 impatient tab-switches: all 4 /mimin page loads fired at once ---\n");
  const start = performance.now();
  const results = await Promise.all([
    simulateMiminPageLoad("tab 1"),
    simulateMiminPageLoad("tab 2"),
    simulateMiminPageLoad("tab 3"),
    simulateMiminPageLoad("tab 4")
  ]);
  const total = performance.now() - start;
  console.log(`\nAll 4 completed. Total wall time: ${total.toFixed(0)}ms`);
  console.log(`Slowest single tab: ${Math.max(...results).toFixed(0)}ms`);
  process.exit(0);
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
