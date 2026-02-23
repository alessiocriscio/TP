import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod/v4";
import { nanoid } from "nanoid";
import {
  searchAirports,
  createTripRequest,
  getTripRequestByUniqueId,
  updateTripRequest,
  getUserTripRequests,
  createOffers,
  getOffersByTripRequestId,
  getOfferById,
  deleteOffersByTripRequestId,
  saveTripForUser,
  getUserSavedTrips,
  deleteSavedTrip,
  getRecentApiLogs,
} from "./db";
import { searchFlights } from "./flightService";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10_000; // 10 seconds between searches

function checkRateLimit(key: string): boolean {
  const last = rateLimitMap.get(key);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) return false;
  rateLimitMap.set(key, now);
  return true;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  airports: router({
    search: publicProcedure
      .input(z.object({ query: z.string().min(2).max(50) }))
      .query(({ input }) => {
        return searchAirports(input.query);
      }),
  }),

  trips: router({
    create: publicProcedure
      .input(z.object({
        origin: z.string().optional(),
        originCity: z.string().optional(),
        destination: z.string().optional(),
        destinationCity: z.string().optional(),
        departureDate: z.string().optional(),
        returnDate: z.string().optional(),
        travelers: z.number().min(1).max(20).optional(),
        tripStyle: z.string().optional(),
        budgetType: z.enum(["flights_only", "total_trip"]).optional(),
        totalBudget: z.string().optional(),
        currency: z.string().optional(),
        flightSplit: z.number().optional(),
        hotelSplit: z.number().optional(),
        activitySplit: z.number().optional(),
        preferences: z.any().optional(),
        sessionId: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const uniqueId = nanoid();
        const id = await createTripRequest({
          uniqueId,
          userId: ctx.user?.id ?? undefined,
          sessionId: input.sessionId,
          origin: input.origin,
          originCity: input.originCity,
          destination: input.destination,
          destinationCity: input.destinationCity,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          travelers: input.travelers ?? 1,
          tripStyle: input.tripStyle,
          budgetType: input.budgetType ?? "total_trip",
          totalBudget: input.totalBudget,
          currency: input.currency ?? "EUR",
          flightSplit: input.flightSplit ?? 50,
          hotelSplit: input.hotelSplit ?? 35,
          activitySplit: input.activitySplit ?? 15,
          preferences: input.preferences,
          status: "draft",
        });
        return { uniqueId, id };
      }),

    get: publicProcedure
      .input(z.object({ uniqueId: z.string() }))
      .query(async ({ input }) => {
        return getTripRequestByUniqueId(input.uniqueId);
      }),

    myTrips: protectedProcedure.query(async ({ ctx }) => {
      return getUserTripRequests(ctx.user.id);
    }),

    update: publicProcedure
      .input(z.object({
        uniqueId: z.string(),
        data: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const trip = await getTripRequestByUniqueId(input.uniqueId);
        if (!trip) throw new Error("Trip not found");
        await updateTripRequest(trip.id, input.data as any);
        return { success: true };
      }),
  }),

  offers: router({
    search: publicProcedure
      .input(z.object({
        tripUniqueId: z.string(),
        origin: z.string(),
        destination: z.string(),
        departureDate: z.string(),
        returnDate: z.string(),
        travelers: z.number().min(1).max(20),
        currency: z.string().default("EUR"),
        maxStops: z.number().optional(),
        timePreference: z.string().optional(),
        baggage: z.boolean().optional(),
        budgetPerPerson: z.number().optional(),
        tripStyle: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const rateLimitKey = `${input.origin}-${input.destination}-${input.departureDate}`;
        if (!checkRateLimit(rateLimitKey)) {
          // Return cached results if rate limited
          const trip = await getTripRequestByUniqueId(input.tripUniqueId);
          if (trip) {
            const cached = await getOffersByTripRequestId(trip.id);
            if (cached.length > 0) return { offers: cached, cached: true };
          }
        }

        const results = await searchFlights({
          origin: input.origin,
          destination: input.destination,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          travelers: input.travelers,
          currency: input.currency,
          maxStops: input.maxStops,
          timePreference: input.timePreference,
          baggage: input.baggage,
          budgetPerPerson: input.budgetPerPerson,
          tripStyle: input.tripStyle,
        });

        // Save to DB
        const trip = await getTripRequestByUniqueId(input.tripUniqueId);
        if (trip) {
          await deleteOffersByTripRequestId(trip.id);
          await updateTripRequest(trip.id, { status: "completed" });
          const offersToInsert = results.map(r => ({
            tripRequestId: trip.id,
            airline: r.airline,
            airlineLogo: r.airlineLogo,
            flightNumber: r.flightNumber,
            departureTime: r.departureTime,
            arrivalTime: r.arrivalTime,
            returnDepartureTime: r.returnDepartureTime,
            returnArrivalTime: r.returnArrivalTime,
            stops: r.stops,
            returnStops: r.returnStops,
            duration: r.duration,
            returnDuration: r.returnDuration,
            flightPrice: r.flightPrice.toString(),
            hotelEstimate: r.hotelEstimate.toString(),
            activityEstimate: r.activityEstimate.toString(),
            totalEstimate: r.totalEstimate.toString(),
            dealScore: r.dealScore.toString(),
            currency: r.currency,
            bookingUrl: r.bookingUrl,
            isEstimate: r.isEstimate ? 1 : 0,
          }));
          await createOffers(offersToInsert);
        }

        return { offers: results, cached: false };
      }),

    getByTrip: publicProcedure
      .input(z.object({ tripUniqueId: z.string() }))
      .query(async ({ input }) => {
        const trip = await getTripRequestByUniqueId(input.tripUniqueId);
        if (!trip) return [];
        return getOffersByTripRequestId(trip.id);
      }),

    getDetail: publicProcedure
      .input(z.object({ offerId: z.number() }))
      .query(async ({ input }) => {
        return getOfferById(input.offerId);
      }),

    refresh: publicProcedure
      .input(z.object({
        tripUniqueId: z.string(),
        origin: z.string(),
        destination: z.string(),
        departureDate: z.string(),
        returnDate: z.string(),
        travelers: z.number().min(1).max(20),
        currency: z.string().default("EUR"),
        maxStops: z.number().optional(),
        timePreference: z.string().optional(),
        baggage: z.boolean().optional(),
        budgetPerPerson: z.number().optional(),
        tripStyle: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const rateLimitKey = `refresh-${input.tripUniqueId}`;
        if (!checkRateLimit(rateLimitKey)) {
          const trip = await getTripRequestByUniqueId(input.tripUniqueId);
          if (trip) {
            const cached = await getOffersByTripRequestId(trip.id);
            if (cached.length > 0) return { offers: cached, cached: true, rateLimited: true };
          }
        }

        const results = await searchFlights({
          origin: input.origin,
          destination: input.destination,
          departureDate: input.departureDate,
          returnDate: input.returnDate,
          travelers: input.travelers,
          currency: input.currency,
          maxStops: input.maxStops,
          timePreference: input.timePreference,
          baggage: input.baggage,
          budgetPerPerson: input.budgetPerPerson,
          tripStyle: input.tripStyle,
        });

        const trip = await getTripRequestByUniqueId(input.tripUniqueId);
        if (trip) {
          await deleteOffersByTripRequestId(trip.id);
          const offersToInsert = results.map(r => ({
            tripRequestId: trip.id,
            airline: r.airline,
            airlineLogo: r.airlineLogo,
            flightNumber: r.flightNumber,
            departureTime: r.departureTime,
            arrivalTime: r.arrivalTime,
            returnDepartureTime: r.returnDepartureTime,
            returnArrivalTime: r.returnArrivalTime,
            stops: r.stops,
            returnStops: r.returnStops,
            duration: r.duration,
            returnDuration: r.returnDuration,
            flightPrice: r.flightPrice.toString(),
            hotelEstimate: r.hotelEstimate.toString(),
            activityEstimate: r.activityEstimate.toString(),
            totalEstimate: r.totalEstimate.toString(),
            dealScore: r.dealScore.toString(),
            currency: r.currency,
            bookingUrl: r.bookingUrl,
            isEstimate: r.isEstimate ? 1 : 0,
          }));
          await createOffers(offersToInsert);
        }

        return { offers: results, cached: false, rateLimited: false };
      }),
  }),

  saved: router({
    save: protectedProcedure
      .input(z.object({
        tripRequestId: z.number(),
        offerId: z.number().optional(),
        name: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await saveTripForUser({
          userId: ctx.user.id,
          tripRequestId: input.tripRequestId,
          offerId: input.offerId,
          name: input.name,
          notes: input.notes,
        });
        return { id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSavedTrips(ctx.user.id);
    }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await deleteSavedTrip(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  admin: router({
    logs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
      .query(async ({ input }) => {
        return getRecentApiLogs(input?.limit ?? 50);
      }),
  }),
});

export type AppRouter = typeof appRouter;
