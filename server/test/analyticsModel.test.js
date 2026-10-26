import test from "node:test";
import assert from "node:assert/strict";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

test("anonymous analytics events accept only the approved, non-identifying shape", () => {
  const event = new AnalyticsEvent({
    visitorHash: "a".repeat(64),
    sessionHash: "b".repeat(64),
    eventType: "product_view",
    path: "/products/example-piece",
    productSlug: "example-piece",
    occurredAt: new Date("2026-10-26T00:00:00.000Z"),
  });

  assert.equal(event.validateSync(), undefined);
  for (const field of [
    "name",
    "email",
    "ip",
    "ipAddress",
    "userAgent",
    "location",
    "referrer",
    "query",
  ]) {
    assert.equal(AnalyticsEvent.schema.path(field), undefined);
  }
});

test("anonymous analytics event types are restricted and expiry uses a TTL index", () => {
  const invalid = new AnalyticsEvent({
    visitorHash: "a".repeat(64),
    sessionHash: "b".repeat(64),
    eventType: "email_signup",
    path: "/",
  });
  assert.ok(invalid.validateSync().errors.eventType);

  const expiryIndex = AnalyticsEvent.schema
    .indexes()
    .find(([fields]) =>
      Object.prototype.hasOwnProperty.call(fields, "expiresAt"),
    );
  assert.deepEqual(expiryIndex, [
    { expiresAt: 1 },
    { expireAfterSeconds: 0, background: true },
  ]);
});
