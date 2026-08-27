import {drizzle} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare: false is required against pooled/pgbouncer-style connections
// (DB_POSTGRES_URL runs through a pooler) since prepared statements aren't
// safe under transaction pooling.
//
// Cached on globalThis in dev: this module gets re-evaluated on every
// Turbopack/Fast Refresh hot-reload, and without caching, each reload would
// spin up a brand-new postgres connection pool without closing the previous
// one  -  over a long dev session with many edits, that leaks connections
// until the pooler's limit is exhausted and every query starts queuing for
// a free connection, which reads as the whole site getting steadily
// "laggier" the longer the session runs. Production doesn't hot-reload, so
// it just creates the client once as before.
declare global {
  // eslint-disable-next-line no-var
  var __natloversPgClient: ReturnType<typeof postgres> | undefined;
}

// max was 5 for a while on the theory that a smaller pool is a better
// citizen of Supabase's shared pooler capacity  -  measured under real load,
// that was actually the cause of the "Customers/Orders render forever"
// symptom: a single admin page load fans out up to 7 concurrent queries
// (e.g. the customers page runs 3 top-level functions in parallel, each of
// which runs 2-3 queries of its own), so just ONE page load could already
// queue behind a 5-connection cap, and two concurrent loads (two tabs, or
// one impatient reload) reliably did. Raised to 10, which every Supabase
// tier's pooler comfortably supports, to actually match this app's real
// concurrency instead of guessing a headroom number that didn't hold up.
//
// statement_timeout is the other half of the fix: without it, a connection
// that gets stuck for any reason (a Fast-Refresh module reload racing an
// in-flight query, a network blip against the pooler, a client that gave up
// but left the server-side handler still awaiting the query) never comes
// back  -  Postgres has no reason to kill it, so it just sits there holding a
// slot forever. Enough of those accumulate over a dev session and every
// subsequent request queues behind connections that will never free up.
// Forcing Postgres to kill any query past 10s converts that into a fast,
// visible error and an immediately-reusable connection instead of a silent
// permanent leak. max_lifetime recycles connections periodically as a
// second line of defense against the same kind of slow accumulation in a
// long-running dev process.
const client =
  globalThis.__natloversPgClient ??
  postgres(process.env.DB_POSTGRES_URL!, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 30 * 60,
    connection: {statement_timeout: 10000}
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__natloversPgClient = client;
}

export const db = drizzle(client, {schema});
export * from "./schema";
