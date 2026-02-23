import { integer, pgEnum, pgTable, text, timestamp, varchar, json, decimal, boolean, serial } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const budgetTypeEnum = pgEnum("budget_type", ["flights_only", "total_trip"]);
export const statusEnum = pgEnum("status", ["draft", "searching", "completed", "saved"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  preferredLanguage: varchar("preferredLanguage", { length: 5 }).default("en"),
  preferredCurrency: varchar("preferredCurrency", { length: 3 }).default("EUR"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const tripRequests = pgTable("trip_requests", {
  id: serial("id").primaryKey(),
  uniqueId: varchar("uniqueId", { length: 36 }).notNull().unique(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 64 }),
  origin: varchar("origin", { length: 10 }),
  originCity: varchar("originCity", { length: 128 }),
  destination: varchar("destination", { length: 10 }),
  destinationCity: varchar("destinationCity", { length: 128 }),
  departureDate: varchar("departureDate", { length: 10 }),
  returnDate: varchar("returnDate", { length: 10 }),
  travelers: integer("travelers").default(1),
  tripStyle: varchar("tripStyle", { length: 32 }),
  budgetType: budgetTypeEnum("budgetType").default("total_trip"),
  totalBudget: decimal("totalBudget", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  flightSplit: integer("flightSplit").default(50),
  hotelSplit: integer("hotelSplit").default(35),
  activitySplit: integer("activitySplit").default(15),
  preferences: json("preferences"),
  chatMessages: json("chatMessages"),
  status: statusEnum("status").default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type TripRequest = typeof tripRequests.$inferSelect;
export type InsertTripRequest = typeof tripRequests.$inferInsert;

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  tripRequestId: integer("tripRequestId").notNull(),
  airline: varchar("airline", { length: 128 }),
  airlineLogo: varchar("airlineLogo", { length: 512 }),
  flightNumber: varchar("flightNumber", { length: 32 }),
  departureTime: varchar("departureTime", { length: 32 }),
  arrivalTime: varchar("arrivalTime", { length: 32 }),
  returnDepartureTime: varchar("returnDepartureTime", { length: 32 }),
  returnArrivalTime: varchar("returnArrivalTime", { length: 32 }),
  stops: integer("stops").default(0),
  returnStops: integer("returnStops").default(0),
  duration: varchar("duration", { length: 32 }),
  returnDuration: varchar("returnDuration", { length: 32 }),
  flightPrice: decimal("flightPrice", { precision: 10, scale: 2 }),
  hotelEstimate: decimal("hotelEstimate", { precision: 10, scale: 2 }),
  activityEstimate: decimal("activityEstimate", { precision: 10, scale: 2 }),
  totalEstimate: decimal("totalEstimate", { precision: 10, scale: 2 }),
  dealScore: decimal("dealScore", { precision: 3, scale: 1 }),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  bookingUrl: varchar("bookingUrl", { length: 1024 }),
  isEstimate: integer("isEstimate").default(1),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Offer = typeof offers.$inferSelect;
export type InsertOffer = typeof offers.$inferInsert;

export const savedTrips = pgTable("saved_trips", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  tripRequestId: integer("tripRequestId").notNull(),
  offerId: integer("offerId"),
  name: varchar("name", { length: 256 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedTrip = typeof savedTrips.$inferSelect;
export type InsertSavedTrip = typeof savedTrips.$inferInsert;

export const priceSnapshots = pgTable("price_snapshots", {
  id: serial("id").primaryKey(),
  offerId: integer("offerId").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  source: varchar("source", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PriceSnapshot = typeof priceSnapshots.$inferSelect;
export type InsertPriceSnapshot = typeof priceSnapshots.$inferInsert;

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  uniqueId: varchar("uniqueId", { length: 36 }).notNull().unique(),
  userId: integer("userId"),
  sessionId: varchar("sessionId", { length: 64 }),
  tripRequestId: integer("tripRequestId"),
  messages: json("messages"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

export const apiLogs = pgTable("api_logs", {
  id: serial("id").primaryKey(),
  endpoint: varchar("endpoint", { length: 256 }),
  method: varchar("method", { length: 10 }),
  statusCode: integer("statusCode"),
  requestBody: json("requestBody"),
  responseBody: json("responseBody"),
  errorMessage: text("errorMessage"),
  durationMs: integer("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertApiLog = typeof apiLogs.$inferInsert;
