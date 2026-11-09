// Runs the database tests against a throwaway Postgres that lives only for this run.
//   npx tsx scripts/test-db.ts            runs every test file in tests/
//   npx tsx scripts/test-db.ts tests/x    runs the files you name
//
// It starts an embedded Postgres on localhost in a temporary folder, applies every migration in
// order, points DB_POSTGRES_URL at it (the tests refuse any database that is not local and named
// scratch or test), runs the tests, then stops and deletes it. Nothing here can reach a real database.
import {spawnSync} from "node:child_process";
import {mkdtempSync, readFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";

// Another worktree may already be running its own scratch database on the default port. Set
// TEST_DB_PORT to run alongside it.
const PORT = Number(process.env.TEST_DB_PORT) || 54329;
const DB_NAME = "natlovers_scratch";
const USER = "scratch";
const PASSWORD = "scratch";
const pgCtl = path.join(process.cwd(), "node_modules", "@embedded-postgres", "windows-x64", "native", "bin", "pg_ctl.exe");

async function main() {
  const dir = mkdtempSync(path.join(tmpdir(), "natlovers-scratch-"));
  const dataDir = path.join(dir, "data");
  const server = new EmbeddedPostgres({databaseDir: dataDir, user: USER, password: PASSWORD, port: PORT, persistent: false});
  let code = 1;
  try {
    await server.initialise();
    // pg_ctl (not the server binary directly) starts Postgres with a restricted token, which is what
    // lets it run from an administrator terminal on Windows.
    const ctl = spawnSync(pgCtl, ["start", "-w", "-t", "60", "-D", dataDir, "-l", path.join(dir, "server.log"), "-o", `-p ${PORT}`], {stdio: "ignore"});
    if (ctl.status !== 0) throw new Error(`pg_ctl start failed (see ${path.join(dir, "server.log")})`);
    const admin = postgres(`postgres://${USER}:${PASSWORD}@localhost:${PORT}/postgres`, {max: 1, onnotice: () => {}});
    await admin.unsafe(`create database ${DB_NAME}`);
    // The migrations were written for Supabase, which ships these roles. Plain Postgres has none.
    for (const role of ["anon", "authenticated", "service_role"]) await admin.unsafe(`create role ${role} nologin`);
    await admin.end();

    const url = `postgres://${USER}:${PASSWORD}@localhost:${PORT}/${DB_NAME}`;
    const sql = postgres(url, {max: 1, onnotice: () => {}});
    const migrations = path.join(process.cwd(), "lib", "db", "migrations");
    const journal = JSON.parse(readFileSync(path.join(migrations, "meta", "_journal.json"), "utf8")) as {entries: {tag: string}[]};
    const skipped: string[] = [];
    for (const entry of journal.entries) {
      const text = readFileSync(path.join(migrations, `${entry.tag}.sql`), "utf8");
      for (const statement of text.split("--> statement-breakpoint")) {
        if (!statement.trim()) continue;
        try {
          await sql.unsafe(statement);
        } catch (error) {
          // One older migration (0029) alters a table that was created by hand in the live database and
          // is not in the migration chain. Those gaps are skipped and reported; the atelier migration
          // (0040) and anything else must apply cleanly.
          const code = (error as {code?: string}).code;
          if (entry.tag.startsWith("0040") || (code !== "42P01" && code !== "42703")) throw error;
          skipped.push(`${entry.tag}: ${(error as Error).message}`);
        }
      }
    }
    await sql.end();
    console.log(`Applied ${journal.entries.length} migrations to a scratch database.`);
    for (const note of skipped) console.log(`  skipped (table missing from the chain): ${note}`);

    const files = process.argv.slice(2);
    const run = spawnSync("npx", ["tsx", "--test", "--test-concurrency=1", ...(files.length ? files : ["tests/*.test.ts"])], {
      stdio: "inherit",
      shell: true,
      env: {...process.env, DB_POSTGRES_URL: url}
    });
    code = run.status ?? 1;
  } finally {
    spawnSync(pgCtl, ["stop", "-m", "immediate", "-D", dataDir], {stdio: "ignore"});
    rmSync(dir, {recursive: true, force: true});
  }
  process.exit(code);
}

main().catch((error) => {
  console.error("Scratch database run failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
