import nock from "nock";

import Context from "../../core/Context";
import {
  SubscriptionFeaturesService,
  SUBSCRIPTION_FEATURES_CACHE_TTL_MS,
} from "../SubscriptionFeatures";

const BASE_URL = "https://localhost";

function makeService(opts?: { ttlMs?: number; now?: () => number }) {
  const context = new Context({ baseUrl: BASE_URL, accessToken: "test" });
  return new SubscriptionFeaturesService(context, opts?.ttlMs, opts?.now);
}

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe("SubscriptionFeaturesService", () => {
  it("calls /api/v1/subscriptions/features/sidedrawer-id/{id}", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-123")
      .reply(200, { "sidedrawer.maxUploadMBs": "600" });

    const service = makeService();
    const features = await service.getFeatures("sd-123");
    expect(features["sidedrawer.maxUploadMBs"]).toBe("600");
  });

  it("parses sidedrawer.maxUploadMBs as a number via getMaxUploadMBs", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-123")
      .reply(200, { "sidedrawer.maxUploadMBs": "250" });

    const service = makeService();
    const limit = await service.getMaxUploadMBs("sd-123");
    expect(limit).toBe(250);
  });

  it("returns null from getMaxUploadMBs when the key is missing", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-123")
      .reply(200, {});

    const service = makeService();
    const limit = await service.getMaxUploadMBs("sd-123");
    expect(limit).toBeNull();
  });

  it("returns null when maxUploadMBs is zero or unparseable", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-zero")
      .reply(200, { "sidedrawer.maxUploadMBs": "0" });
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-garbage")
      .reply(200, { "sidedrawer.maxUploadMBs": "not-a-number" });

    const service = makeService();
    expect(await service.getMaxUploadMBs("sd-zero")).toBeNull();
    expect(await service.getMaxUploadMBs("sd-garbage")).toBeNull();
  });

  it("caches the response within the TTL (single network call for N reads)", async () => {
    const scope = nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-cache")
      .once()
      .reply(200, { "sidedrawer.maxUploadMBs": "100" });

    const service = makeService();
    const a = await service.getMaxUploadMBs("sd-cache");
    const b = await service.getMaxUploadMBs("sd-cache");
    const c = await service.getMaxUploadMBs("sd-cache");

    expect(a).toBe(100);
    expect(b).toBe(100);
    expect(c).toBe(100);
    expect(scope.isDone()).toBe(true);
    expect(nock.pendingMocks()).toEqual([]);
  });

  it("re-fetches after the TTL expires", async () => {
    // First mock returns 100, second returns 200; we simulate time passing
    // by feeding a fake `now` clock that jumps past the TTL between calls.
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-ttl")
      .reply(200, { "sidedrawer.maxUploadMBs": "100" });
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-ttl")
      .reply(200, { "sidedrawer.maxUploadMBs": "200" });

    let fakeNow = 1_000_000;
    const service = makeService({
      ttlMs: SUBSCRIPTION_FEATURES_CACHE_TTL_MS,
      now: () => fakeNow,
    });

    expect(await service.getMaxUploadMBs("sd-ttl")).toBe(100);

    // Jump past the TTL.
    fakeNow += SUBSCRIPTION_FEATURES_CACHE_TTL_MS + 1;

    expect(await service.getMaxUploadMBs("sd-ttl")).toBe(200);
    expect(nock.pendingMocks()).toEqual([]);
  });

  it("does NOT swallow network errors (Files is in charge of fail-open policy)", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-err")
      .reply(500, { error: "boom" });

    const service = makeService();
    await expect(service.getMaxUploadMBs("sd-err")).rejects.toBeDefined();
  });

  it("invalidate(id) drops a single entry", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-inv")
      .reply(200, { "sidedrawer.maxUploadMBs": "100" });
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-inv")
      .reply(200, { "sidedrawer.maxUploadMBs": "200" });

    const service = makeService();
    expect(await service.getMaxUploadMBs("sd-inv")).toBe(100);
    service.invalidate("sd-inv");
    expect(await service.getMaxUploadMBs("sd-inv")).toBe(200);
    expect(nock.pendingMocks()).toEqual([]);
  });

  it("invalidate() (no args) clears the entire cache", async () => {
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-a")
      .reply(200, { "sidedrawer.maxUploadMBs": "10" });
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-b")
      .reply(200, { "sidedrawer.maxUploadMBs": "20" });
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-a")
      .reply(200, { "sidedrawer.maxUploadMBs": "11" });
    nock(BASE_URL)
      .get("/api/v1/subscriptions/features/sidedrawer-id/sd-b")
      .reply(200, { "sidedrawer.maxUploadMBs": "22" });

    const service = makeService();
    expect(await service.getMaxUploadMBs("sd-a")).toBe(10);
    expect(await service.getMaxUploadMBs("sd-b")).toBe(20);
    service.invalidate();
    expect(await service.getMaxUploadMBs("sd-a")).toBe(11);
    expect(await service.getMaxUploadMBs("sd-b")).toBe(22);
    expect(nock.pendingMocks()).toEqual([]);
  });
});
