// Removes every customer order, bag item and wishlist heart. NOT to be run against production.
//
// Dry run (default, deletes nothing, prints row counts):
//   RESET_DATABASE_URL="postgres://...local or scratch..." npx tsx scripts/reset-commerce-data.ts
//
// Delete (asks you to type a phrase):
//   RESET_DATABASE_URL="..." npx tsx scripts/reset-commerce-data.ts --confirm
//   add --include-paid if any order is Paid or Shipped
//
// The database URL is read from RESET_DATABASE_URL, which you pass in your own terminal. It is
// never read from .env files. A non-local host is refused unless you add --allow-remote.
//
// Never deleted: user accounts, products, add-ons, settings. Stock counters are never changed:
// the script only reports whether the deleted orders had reduced them, so you can reset by hand.
import {createInterface} from "node:readline/promises";
import {mkdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import postgres from "postgres";

const PHRASE = "DELETE ALL ORDERS";

const args = new Set(process.argv.slice(2));
const confirm = args.has("--confirm");
const includePaid = args.has("--include-paid");
const allowRemote = args.has("--allow-remote");

const url = process.env.RESET_DATABASE_URL;
if (!url) {
  console.error("Set RESET_DATABASE_URL in your own terminal. Nothing was done.");
  process.exit(1);
}

const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
if (!isLocal && !allowRemote) {
  console.error(`Refusing to run against "${host}". This script is for a local or scratch database. Add --allow-remote only for a scratch database you are sure is not production.`);
  process.exit(1);
}

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]);
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
}

function photoUrls(value: unknown, found: Set<string>) {
  if (typeof value === "string") {
    if (/^https?:\/\//.test(value) && /(blob|vercel-storage|supabase)/i.test(value)) found.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => photoUrls(entry, found));
  } else if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((entry) => photoUrls(entry, found));
  }
}

async function main() {
  const sql = postgres(url!, {max: 1, onnotice: () => {}});
  try {
    const count = async (table: string, where = "") => Number((await sql.unsafe(`select count(*)::int as n from ${table} ${where}`))[0].n);

    const counts = {
      orders: await count("orders"),
      order_items: await count("order_items"),
      order_item_addons: await count("order_item_addons"),
      cart_items: await count("cart_items"),
      wishlist_items: await count("wishlist_items")
    };
    const paidOrShipped = await count("orders", "where status in ('paid', 'fulfilled')");

    console.log(`\nDatabase host: ${host}`);
    console.log(confirm ? "Mode: DELETE (after the phrase)\n" : "Mode: dry run, nothing will be deleted\n");
    console.table(counts);
    console.log(`Paid or shipped orders: ${paidOrShipped}`);

    // Stock: only paid and shipped orders reduced the counters (see markOrderPaid).
    const stockRows = await sql.unsafe(`
      select oi.product_slug as slug, sum(oi.quantity)::int as quantity, p.stock as current_stock
      from order_items oi
      join orders o on o.id = oi.order_id and o.status in ('paid', 'fulfilled')
      left join products p on p.slug = oi.product_slug
      group by oi.product_slug, p.stock
      order by oi.product_slug`);
    const tracked = stockRows.filter((row) => row.current_stock !== null);
    console.log("\nStock counters:");
    if (tracked.length) {
      console.log("These products track stock, and paid or shipped orders reduced it. This script does NOT change stock. Add the quantity back by hand if you want it restored:");
      console.table(tracked.map((row) => ({product: row.slug, reduced_by: row.quantity, current_stock: row.current_stock})));
    } else {
      console.log("No stock-tracked product was reduced by these orders.");
    }

    // Reference photos that will no longer be referenced. Listed, never deleted.
    const photos = new Set<string>();
    for (const row of await sql.unsafe("select reference_images from order_item_addons")) photoUrls(row.reference_images, photos);
    for (const row of await sql.unsafe("select config from order_items")) photoUrls(row.config, photos);
    for (const row of await sql.unsafe("select config from cart_items")) photoUrls(row.config, photos);
    console.log(`\nReference photos that would be orphaned in storage (not deleted): ${photos.size}`);
    [...photos].slice(0, 20).forEach((photo) => console.log("  " + photo));
    if (photos.size > 20) console.log(`  ...and ${photos.size - 20} more (full list is written with the backup)`);

    if (!confirm) {
      console.log("\nDry run only. Add --confirm to delete.");
      return;
    }

    if (paidOrShipped > 0 && !includePaid) {
      console.error(`\nRefusing: ${paidOrShipped} order(s) are Paid or Shipped. Add --include-paid if you really want them removed.`);
      process.exitCode = 1;
      return;
    }

    const rl = createInterface({input: process.stdin, output: process.stdout});
    const typed = (await rl.question(`\nType exactly "${PHRASE}" to continue: `)).trim();
    rl.close();
    if (typed !== PHRASE) {
      console.error("The phrase did not match. Nothing was deleted.");
      process.exitCode = 1;
      return;
    }

    // Backups first, as timestamped CSV files in a gitignored folder.
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dir = path.join(process.cwd(), "backups", stamp);
    mkdirSync(dir, {recursive: true});
    for (const table of ["orders", "order_items", "order_item_addons", "cart_items", "wishlist_items"]) {
      writeFileSync(path.join(dir, `${table}.csv`), toCsv([...(await sql.unsafe(`select * from ${table}`))]));
    }
    writeFileSync(path.join(dir, "orphaned-photo-urls.txt"), [...photos].join("\n"));
    console.log(`\nBackups written to ${dir}`);

    // One transaction. Orders cascade to their items; add-on lines are removed explicitly too.
    await sql.begin(async (tx) => {
      await tx.unsafe("delete from order_item_addons");
      await tx.unsafe("delete from order_items");
      await tx.unsafe("delete from orders");
      await tx.unsafe("delete from cart_items");
      await tx.unsafe("delete from wishlist_items");
    });
    console.log("Deleted orders, order items, add-on lines, bag items and wishlist items. Users, products, add-ons and settings were not touched.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
