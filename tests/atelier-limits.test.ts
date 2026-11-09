import assert from "node:assert/strict";
import {test} from "node:test";
import {
  checkAll,
  checkMonthly,
  checkPerOrder,
  holdsSlot,
  jakartaMonth,
  jakartaMonthRange,
  leadTimeRange,
  orderExpiry,
  resolveCapGroup,
  type LimitLine,
  type Limits
} from "../lib/atelier-limits";

const limits: Limits = {piecesMonthlyCap: 50, piecesMaxPerOrder: 5, extrasMaxPerOrder: 10, extrasMonthlyCap: null};
const piece = (slug: string, quantity: number, maxPerOrder = 5): LimitLine => ({slug, quantity, group: "PIECES", maxPerOrder});
const extra = (slug: string, quantity: number): LimitLine => ({slug, quantity, group: "ATELIER_EXTRAS", maxPerOrder: 10});

test("category mapping: bags and apparel are pieces, dolls and accessories are extras", () => {
  assert.equal(resolveCapGroup(null, "Bags"), "PIECES");
  assert.equal(resolveCapGroup(null, "Apparels"), "PIECES");
  assert.equal(resolveCapGroup(null, "Dolls"), "ATELIER_EXTRAS");
  assert.equal(resolveCapGroup(null, "Accessories"), "ATELIER_EXTRAS");
  assert.equal(resolveCapGroup("PIECES", "Dolls"), "PIECES");
});

test("per order: group total and single product limits both apply", () => {
  assert.equal(checkPerOrder([piece("a", 5)], limits), null);
  assert.deepEqual(checkPerOrder([piece("a", 6)], limits), {code: "product_max", slug: "a", max: 5});
  assert.deepEqual(checkPerOrder([piece("a", 3), piece("b", 3)], limits), {code: "group_max", group: "PIECES", max: 5});
  assert.deepEqual(checkPerOrder([piece("a", 4, 2)], limits), {code: "product_max", slug: "a", max: 2});
  assert.equal(checkPerOrder([extra("d", 10)], limits), null);
  assert.deepEqual(checkPerOrder([extra("d", 11)], limits), {code: "product_max", slug: "d", max: 10});
});

test("felted add-ons count towards the extras total", () => {
  const line: LimitLine = {...piece("bag", 2), addonCount: 4}; // 8 add-ons
  assert.equal(checkPerOrder([line], limits), null);
  assert.deepEqual(checkPerOrder([line, extra("d", 3)], limits), {code: "group_max", group: "ATELIER_EXTRAS", max: 10});
});

test("monthly cap applies to pieces only unless an extras cap is set", () => {
  assert.equal(checkMonthly([piece("a", 2)], limits, {PIECES: 48, ATELIER_EXTRAS: 999}), null);
  assert.deepEqual(checkMonthly([piece("a", 3)], limits, {PIECES: 48, ATELIER_EXTRAS: 0}), {code: "month_full", group: "PIECES", remaining: 2});
  assert.equal(checkMonthly([extra("d", 5)], limits, {PIECES: 50, ATELIER_EXTRAS: 500}), null);
  assert.deepEqual(checkMonthly([extra("d", 5)], {...limits, extrasMonthlyCap: 10}, {PIECES: 0, ATELIER_EXTRAS: 8}), {
    code: "month_full",
    group: "ATELIER_EXTRAS",
    remaining: 2
  });
  assert.equal(checkAll([piece("a", 1)], limits, {PIECES: 49, ATELIER_EXTRAS: 0}), null);
});

test("Jakarta calendar months", () => {
  // 31 Oct 2026 18:00 UTC is already 1 Nov 01:00 in Jakarta.
  assert.deepEqual(jakartaMonth(new Date("2026-10-31T18:00:00Z")), {year: 2026, month: 11});
  assert.deepEqual(jakartaMonth(new Date("2026-10-31T16:59:59Z")), {year: 2026, month: 10});
  const range = jakartaMonthRange({year: 2026, month: 11});
  assert.equal(range.start.toISOString(), "2026-10-31T17:00:00.000Z");
  assert.equal(range.end.toISOString(), "2026-11-30T17:00:00.000Z");
  assert.deepEqual(jakartaMonth(new Date("2026-12-31T20:00:00Z")), {year: 2027, month: 1});
});

test("which orders hold a slot", () => {
  const now = new Date("2026-11-10T00:00:00Z");
  const future = new Date("2026-11-11T00:00:00Z");
  const past = new Date("2026-11-09T00:00:00Z");
  assert.equal(holdsSlot({status: "pending_transfer", expiresAt: future}, now), true);
  assert.equal(holdsSlot({status: "pending_transfer", expiresAt: past}, now), false);
  assert.equal(holdsSlot({status: "paid", expiresAt: past}, now), true);
  assert.equal(holdsSlot({status: "fulfilled", expiresAt: null}, now), true);
  assert.equal(holdsSlot({status: "cancelled", expiresAt: future}, now), false);
  assert.equal(holdsSlot({status: "expired", expiresAt: past}, now), false);
});

test("expiry is 24 hours and lead time shows only when set", () => {
  assert.equal(orderExpiry(new Date("2026-11-09T10:00:00Z")).toISOString(), "2026-11-10T10:00:00.000Z");
  assert.equal(leadTimeRange(null, null), null);
  assert.deepEqual(leadTimeRange(3, 4), {min: 3, max: 4});
  assert.deepEqual(leadTimeRange(4, 3), {min: 3, max: 4});
  assert.deepEqual(leadTimeRange(null, 4), {min: 4, max: 4});
});
