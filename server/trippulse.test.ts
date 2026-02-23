import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// ── Helpers ──────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(overrides?: Partial<AuthenticatedUser>): {
  ctx: TrpcContext;
  clearedCookies: Array<{ name: string; options: Record<string, unknown> }>;
} {
  const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@trippulse.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

// ── Auth Tests ───────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-001");
    expect(result?.email).toBe("test@trippulse.com");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

// ── Airport Search Tests ─────────────────────────────────────────

describe("airports.search", () => {
  it("returns results for a valid query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.airports.search({ query: "Rome" });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    const fco = results.find((a: any) => a.iata === "FCO");
    expect(fco).toBeDefined();
    expect(fco?.city).toContain("Rome");
  });

  it("returns results for IATA code search", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.airports.search({ query: "BCN" });
    expect(results.length).toBeGreaterThan(0);
    const bcn = results.find((a: any) => a.iata === "BCN");
    expect(bcn).toBeDefined();
  });

  it("returns empty array for gibberish query", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const results = await caller.airports.search({ query: "xyzqw" });
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });

  it("rejects queries that are too short", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.airports.search({ query: "a" })).rejects.toThrow();
  });
});

// ── Trip Creation Tests ──────────────────────────────────────────

describe("trips.create", () => {
  it("creates a trip and returns a unique ID", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trips.create({
      origin: "FCO",
      originCity: "Rome",
      destination: "BCN",
      destinationCity: "Barcelona",
      departureDate: "2026-04-01",
      returnDate: "2026-04-08",
      travelers: 2,
      totalBudget: "800",
      currency: "EUR",
    });
    expect(result.uniqueId).toBeDefined();
    expect(typeof result.uniqueId).toBe("string");
    expect(result.uniqueId.length).toBeGreaterThan(5);
  });

  it("creates a trip with minimal params", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.trips.create({});
    expect(result.uniqueId).toBeDefined();
  });
});

// ── Trip Retrieval Tests ─────────────────────────────────────────

describe("trips.get", () => {
  it("returns a trip by uniqueId after creation", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.trips.create({
      origin: "LHR",
      originCity: "London",
      destination: "CDG",
      destinationCity: "Paris",
      departureDate: "2026-05-01",
      returnDate: "2026-05-05",
      travelers: 1,
    });
    const trip = await caller.trips.get({ uniqueId: created.uniqueId });
    expect(trip).toBeDefined();
    expect(trip?.origin).toBe("LHR");
    expect(trip?.destination).toBe("CDG");
    expect(trip?.travelers).toBe(1);
  });

  it("returns undefined for non-existent uniqueId", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const trip = await caller.trips.get({ uniqueId: "nonexistent-id-xyz" });
    expect(trip).toBeFalsy();
  });
});

// ── Offers Search Tests ──────────────────────────────────────────

describe("offers.search", () => {
  it("returns flight offers for a valid search", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First create a trip
    const trip = await caller.trips.create({
      origin: "FCO",
      destination: "BCN",
      departureDate: "2026-04-01",
      returnDate: "2026-04-08",
      travelers: 2,
    });

    const result = await caller.offers.search({
      tripUniqueId: trip.uniqueId,
      origin: "FCO",
      destination: "BCN",
      departureDate: "2026-04-01",
      returnDate: "2026-04-08",
      travelers: 2,
      currency: "EUR",
    });

    expect(result.offers).toBeDefined();
    expect(Array.isArray(result.offers)).toBe(true);
    expect(result.offers.length).toBeGreaterThan(0);
    expect(result.offers.length).toBeLessThanOrEqual(10);

    // Verify offer structure
    const offer = result.offers[0];
    expect(offer).toHaveProperty("airline");
    expect(offer).toHaveProperty("flightNumber");
    expect(offer).toHaveProperty("flightPrice");
    expect(offer).toHaveProperty("dealScore");
    expect(offer).toHaveProperty("departureTime");
    expect(offer).toHaveProperty("arrivalTime");
  });

  it("offers are sorted by deal score descending", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const trip = await caller.trips.create({
      origin: "FCO",
      destination: "BCN",
      departureDate: "2026-04-10",
      returnDate: "2026-04-17",
      travelers: 1,
    });

    const result = await caller.offers.search({
      tripUniqueId: trip.uniqueId,
      origin: "FCO",
      destination: "BCN",
      departureDate: "2026-04-10",
      returnDate: "2026-04-17",
      travelers: 1,
    });

    const scores = result.offers.map((o: any) =>
      typeof o.dealScore === "string" ? parseFloat(o.dealScore) : o.dealScore
    );
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });
});

// ── Saved Trips Tests ────────────────────────────────────────────

describe("saved.list", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.saved.list()).rejects.toThrow();
  });

  it("returns an array for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.saved.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("saved.save", () => {
  it("requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.saved.save({ tripRequestId: 1 })
    ).rejects.toThrow();
  });
});

// ── i18n Tests (shared module) ───────────────────────────────────

describe("i18n translations", () => {
  it("all languages have the same keys", async () => {
    const { translations } = await import("../shared/i18n");
    const langs = Object.keys(translations);
    expect(langs).toContain("en");
    expect(langs).toContain("it");
    expect(langs).toContain("es");
    expect(langs).toContain("de");
    expect(langs).toContain("fr");

    const enKeys = Object.keys(translations.en).sort();
    for (const lang of langs) {
      const langKeys = Object.keys(translations[lang as keyof typeof translations]).sort();
      expect(langKeys).toEqual(enKeys);
    }
  });

  it("no translation value is empty", async () => {
    const { translations } = await import("../shared/i18n");
    for (const [lang, dict] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value, `${lang}.${key} should not be empty`).toBeTruthy();
      }
    }
  });
});
