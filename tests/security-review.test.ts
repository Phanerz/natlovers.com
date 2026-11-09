// Fixes from the security review: constant-time cron secret, no repeat waiting-list mail, and a
// rate limiter that holds under a burst. The burst test needs a SCRATCH Postgres (see
// concurrent-checkout.test.ts) and is skipped otherwise.
import assert from "node:assert/strict";
import {test} from "node:test";
import {cronAuthorised} from "../lib/cron-auth";

test("cron secret: only the exact bearer value passes", () => {
  assert.equal(cronAuthorised("Bearer s3cret", "s3cret"), true);
  assert.equal(cronAuthorised("Bearer s3cre", "s3cret"), false);
  assert.equal(cronAuthorised("Bearer s3cret2", "s3cret"), false);
  assert.equal(cronAuthorised("s3cret", "s3cret"), false);
  assert.equal(cronAuthorised("", "s3cret"), false);
  assert.equal(cronAuthorised(null, "s3cret"), false);
});

const url = process.env.DB_POSTGRES_URL ?? "";
const dbName = url.split("/").pop()?.split("?")[0] ?? "";
const safe = /scratch|test/i.test(dbName) && /localhost|127\.0\.0\.1/.test(url);

test("waiting list: joining again while already waiting sends no second email", async () => {
  const {shouldSendJoinEmail} = await import("../lib/waiting-list");
  assert.equal(shouldSendJoinEmail(undefined), true);
  assert.equal(shouldSendJoinEmail({notifiedAt: null, unsubscribedAt: null}), false);
  assert.equal(shouldSendJoinEmail({notifiedAt: new Date(), unsubscribedAt: null}), true);
  assert.equal(shouldSendJoinEmail({notifiedAt: null, unsubscribedAt: new Date()}), true);
});

test("rate limiter: a simultaneous burst still gets exactly the limit", {skip: safe ? false : "needs a local scratch database (DB_POSTGRES_URL)"}, async () => {
  const {allowRequest} = await import("../lib/rate-limit");
  const key = `burst-${Date.now()}`;
  const results = await Promise.all(Array.from({length: 40}, () => allowRequest(key, 5, 3600_000)));
  assert.equal(results.filter(Boolean).length, 5);
});
