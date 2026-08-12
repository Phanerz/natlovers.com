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
// one — over a long dev session with many edits, that leaks connections
// until the pooler's limit is exhausted and every query starts queuing for
// a free connection, which reads as the whole site getting steadily
// "laggier" the longer the session runs. Production doesn't hot-reload, so
// it just creates the client once as before.
declare global {
  // eslint-disable-next-line no-var
  var __natloversPgClient: ReturnType<typeof postgres> | undefined;
}

const client = globalThis.__natloversPgClient ?? postgres(process.env.DB_POSTGRES_URL!, {prepare: false});

if (process.env.NODE_ENV !== "production") {
  globalThis.__natloversPgClient = client;
}

export const db = drizzle(client, {schema});
export * from "./schema";
