// Reads the database address for the reset script and decides whether it may be used. Kept apart
// from the script so it can be tested without touching a database.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
// The only query settings accepted. Anything else is refused, so nothing in the query string can
// point the connection somewhere other than the host the check looked at.
const ALLOWED_QUERY = new Set(["sslmode", "connect_timeout", "application_name"]);
const HOST_OVERRIDES = new Set(["host", "hostaddr", "hosts", "service", "servicefile", "port"]);

export type ResetUrlResult =
  | {ok: true; host: string; isLocal: boolean; connectionUrl: string}
  | {ok: false; reason: string};

export function parseResetUrl(raw: string, options: {allowRemote: boolean}): ResetUrlResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {ok: false, reason: "The database address is not a valid URL."};
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    return {ok: false, reason: "The database address must start with postgres:// or postgresql://."};
  }
  const host = url.hostname.toLowerCase();
  if (!host) return {ok: false, reason: "The database address has no host."};
  if (!/^[a-z0-9.\-[\]:]+$/.test(host)) {
    return {ok: false, reason: "The database address host contains characters that are not allowed (several hosts are not accepted)."};
  }
  for (const key of url.searchParams.keys()) {
    const name = key.toLowerCase();
    if (HOST_OVERRIDES.has(name)) {
      return {ok: false, reason: `The database address has a "${key}" setting in its query string. Host overrides are refused.`};
    }
    if (!ALLOWED_QUERY.has(name)) {
      return {ok: false, reason: `The database address has an unexpected "${key}" setting in its query string. Remove it.`};
    }
  }
  const isLocal = LOCAL_HOSTS.has(host);
  if (!isLocal && !options.allowRemote) {
    return {
      ok: false,
      reason: `Refusing to run against "${host}". This script is local-only by default. Add --allow-remote only when you really mean to run against that database.`
    };
  }
  // Rebuilt from the parts that were checked, so the connection goes exactly where the check looked.
  const auth = url.username ? `${url.username}${url.password ? `:${url.password}` : ""}@` : "";
  const connectionUrl = `${url.protocol}//${auth}${host}${url.port ? `:${url.port}` : ""}${url.pathname}${url.search}`;
  return {ok: true, host, isLocal, connectionUrl};
}
