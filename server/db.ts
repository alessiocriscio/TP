import { eq, desc, and, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
// @ts-ignore - pg types
import {
  InsertUser, users,
  tripRequests, InsertTripRequest, TripRequest,
  offers, InsertOffer, Offer,
  savedTrips, InsertSavedTrip,
  priceSnapshots, InsertPriceSnapshot,
  chatSessions, InsertChatSession,
  apiLogs, InsertApiLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: pg.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle({ client: _pool });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ---- Users ----
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    if (existing.length > 0) {
      const updateSet: Record<string, unknown> = {};
      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];
      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        const normalized = value ?? null;
        updateSet[field] = normalized;
      };
      textFields.forEach(assignNullable);
      if (user.lastSignedIn !== undefined) { updateSet.lastSignedIn = user.lastSignedIn; }
      if (user.role !== undefined) { updateSet.role = user.role; }
      else if (user.openId === ENV.ownerOpenId) { updateSet.role = 'admin'; }
      if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
      updateSet.updatedAt = new Date();
      await db.update(users).set(updateSet).where(eq(users.openId, user.openId));
    } else {
      const values: InsertUser = { openId: user.openId };
      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];
      textFields.forEach((field: TextField) => {
        const value = user[field];
        if (value !== undefined) values[field] = value ?? null;
      });
      if (user.lastSignedIn !== undefined) values.lastSignedIn = user.lastSignedIn;
      if (user.role !== undefined) values.role = user.role;
      else if (user.openId === ENV.ownerOpenId) values.role = 'admin';
      if (!values.lastSignedIn) values.lastSignedIn = new Date();
      await db.insert(users).values(values);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ---- Trip Requests ----
export async function createTripRequest(data: InsertTripRequest) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(tripRequests).values(data).returning({ id: tripRequests.id });
  return result[0]?.id ?? null;
}

export async function getTripRequestByUniqueId(uniqueId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(tripRequests).where(eq(tripRequests.uniqueId, uniqueId)).limit(1);
  return result[0] ?? null;
}

export async function updateTripRequest(id: number, data: Partial<InsertTripRequest>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tripRequests).set(data).where(eq(tripRequests.id, id));
}

export async function getUserTripRequests(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tripRequests).where(eq(tripRequests.userId, userId)).orderBy(desc(tripRequests.createdAt));
}

// ---- Offers ----
export async function createOffers(data: InsertOffer[]) {
  const db = await getDb();
  if (!db) return;
  if (data.length === 0) return;
  await db.insert(offers).values(data);
}

export async function getOffersByTripRequestId(tripRequestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(offers).where(eq(offers.tripRequestId, tripRequestId)).orderBy(desc(offers.dealScore));
}

export async function getOfferById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  return result[0] ?? null;
}

export async function deleteOffersByTripRequestId(tripRequestId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(offers).where(eq(offers.tripRequestId, tripRequestId));
}

// ---- Saved Trips ----
export async function saveTripForUser(data: InsertSavedTrip) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(savedTrips).values(data).returning({ id: savedTrips.id });
  return result[0]?.id ?? null;
}

export async function getUserSavedTrips(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(savedTrips).where(eq(savedTrips.userId, userId)).orderBy(desc(savedTrips.createdAt));
}

export async function deleteSavedTrip(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(savedTrips).where(and(eq(savedTrips.id, id), eq(savedTrips.userId, userId)));
}

// ---- Price Snapshots ----
export async function addPriceSnapshot(data: InsertPriceSnapshot) {
  const db = await getDb();
  if (!db) return;
  await db.insert(priceSnapshots).values(data);
}

export async function getSnapshotsForOffer(offerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(priceSnapshots).where(eq(priceSnapshots.offerId, offerId)).orderBy(desc(priceSnapshots.createdAt));
}

// ---- Chat Sessions ----
export async function upsertChatSession(data: InsertChatSession) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(chatSessions).where(eq(chatSessions.uniqueId, data.uniqueId)).limit(1);
  if (existing.length > 0) {
    await db.update(chatSessions).set({
      messages: data.messages,
      tripRequestId: data.tripRequestId,
      updatedAt: new Date(),
    }).where(eq(chatSessions.uniqueId, data.uniqueId));
  } else {
    await db.insert(chatSessions).values(data);
  }
}

export async function getChatSession(uniqueId: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(chatSessions).where(eq(chatSessions.uniqueId, uniqueId)).limit(1);
  return result[0] ?? null;
}

// ---- API Logs ----
export async function logApiCall(data: InsertApiLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(apiLogs).values(data);
  } catch (e) {
    console.error("[DB] Failed to log API call:", e);
  }
}

export async function getRecentApiLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiLogs).orderBy(desc(apiLogs.createdAt)).limit(limit);
}

// ---- Airport Search (static data) ----
const AIRPORTS = [
  { iata: "FCO", city: "Rome", country: "Italy", name: "Leonardo da Vinci–Fiumicino" },
  { iata: "MXP", city: "Milan", country: "Italy", name: "Milan Malpensa" },
  { iata: "LIN", city: "Milan", country: "Italy", name: "Milan Linate" },
  { iata: "NAP", city: "Naples", country: "Italy", name: "Naples International" },
  { iata: "VCE", city: "Venice", country: "Italy", name: "Venice Marco Polo" },
  { iata: "BLQ", city: "Bologna", country: "Italy", name: "Bologna Guglielmo Marconi" },
  { iata: "CTA", city: "Catania", country: "Italy", name: "Catania-Fontanarossa" },
  { iata: "PMO", city: "Palermo", country: "Italy", name: "Palermo Falcone-Borsellino" },
  { iata: "FLR", city: "Florence", country: "Italy", name: "Florence Peretola" },
  { iata: "TRN", city: "Turin", country: "Italy", name: "Turin Caselle" },
  { iata: "LHR", city: "London", country: "UK", name: "London Heathrow" },
  { iata: "LGW", city: "London", country: "UK", name: "London Gatwick" },
  { iata: "STN", city: "London", country: "UK", name: "London Stansted" },
  { iata: "CDG", city: "Paris", country: "France", name: "Paris Charles de Gaulle" },
  { iata: "ORY", city: "Paris", country: "France", name: "Paris Orly" },
  { iata: "BCN", city: "Barcelona", country: "Spain", name: "Barcelona El Prat" },
  { iata: "MAD", city: "Madrid", country: "Spain", name: "Madrid Barajas" },
  { iata: "AMS", city: "Amsterdam", country: "Netherlands", name: "Amsterdam Schiphol" },
  { iata: "FRA", city: "Frankfurt", country: "Germany", name: "Frankfurt am Main" },
  { iata: "MUC", city: "Munich", country: "Germany", name: "Munich" },
  { iata: "BER", city: "Berlin", country: "Germany", name: "Berlin Brandenburg" },
  { iata: "ZRH", city: "Zurich", country: "Switzerland", name: "Zurich" },
  { iata: "VIE", city: "Vienna", country: "Austria", name: "Vienna International" },
  { iata: "IST", city: "Istanbul", country: "Turkey", name: "Istanbul" },
  { iata: "ATH", city: "Athens", country: "Greece", name: "Athens International" },
  { iata: "LIS", city: "Lisbon", country: "Portugal", name: "Lisbon Humberto Delgado" },
  { iata: "DUB", city: "Dublin", country: "Ireland", name: "Dublin" },
  { iata: "CPH", city: "Copenhagen", country: "Denmark", name: "Copenhagen" },
  { iata: "ARN", city: "Stockholm", country: "Sweden", name: "Stockholm Arlanda" },
  { iata: "OSL", city: "Oslo", country: "Norway", name: "Oslo Gardermoen" },
  { iata: "HEL", city: "Helsinki", country: "Finland", name: "Helsinki-Vantaa" },
  { iata: "WAW", city: "Warsaw", country: "Poland", name: "Warsaw Chopin" },
  { iata: "PRG", city: "Prague", country: "Czech Republic", name: "Vaclav Havel Prague" },
  { iata: "BUD", city: "Budapest", country: "Hungary", name: "Budapest Ferenc Liszt" },
  { iata: "OTP", city: "Bucharest", country: "Romania", name: "Bucharest Henri Coanda" },
  { iata: "JFK", city: "New York", country: "USA", name: "John F. Kennedy" },
  { iata: "LAX", city: "Los Angeles", country: "USA", name: "Los Angeles International" },
  { iata: "ORD", city: "Chicago", country: "USA", name: "Chicago O'Hare" },
  { iata: "MIA", city: "Miami", country: "USA", name: "Miami International" },
  { iata: "SFO", city: "San Francisco", country: "USA", name: "San Francisco International" },
  { iata: "DXB", city: "Dubai", country: "UAE", name: "Dubai International" },
  { iata: "SIN", city: "Singapore", country: "Singapore", name: "Singapore Changi" },
  { iata: "HND", city: "Tokyo", country: "Japan", name: "Tokyo Haneda" },
  { iata: "NRT", city: "Tokyo", country: "Japan", name: "Tokyo Narita" },
  { iata: "BKK", city: "Bangkok", country: "Thailand", name: "Suvarnabhumi" },
  { iata: "HKG", city: "Hong Kong", country: "China", name: "Hong Kong International" },
  { iata: "ICN", city: "Seoul", country: "South Korea", name: "Incheon International" },
  { iata: "SYD", city: "Sydney", country: "Australia", name: "Sydney Kingsford Smith" },
  { iata: "GRU", city: "São Paulo", country: "Brazil", name: "São Paulo Guarulhos" },
  { iata: "MEX", city: "Mexico City", country: "Mexico", name: "Mexico City International" },
  { iata: "CUN", city: "Cancún", country: "Mexico", name: "Cancún International" },
  { iata: "CAI", city: "Cairo", country: "Egypt", name: "Cairo International" },
  { iata: "JNB", city: "Johannesburg", country: "South Africa", name: "O.R. Tambo" },
  { iata: "DEL", city: "New Delhi", country: "India", name: "Indira Gandhi International" },
  { iata: "BOM", city: "Mumbai", country: "India", name: "Chhatrapati Shivaji Maharaj" },
  { iata: "PEK", city: "Beijing", country: "China", name: "Beijing Capital" },
  { iata: "PVG", city: "Shanghai", country: "China", name: "Shanghai Pudong" },
  { iata: "DOH", city: "Doha", country: "Qatar", name: "Hamad International" },
  { iata: "AUH", city: "Abu Dhabi", country: "UAE", name: "Abu Dhabi International" },
  { iata: "CMB", city: "Colombo", country: "Sri Lanka", name: "Bandaranaike International" },
  { iata: "MLE", city: "Malé", country: "Maldives", name: "Velana International" },
  { iata: "PMI", city: "Palma de Mallorca", country: "Spain", name: "Palma de Mallorca" },
  { iata: "IBZ", city: "Ibiza", country: "Spain", name: "Ibiza" },
  { iata: "TFS", city: "Tenerife", country: "Spain", name: "Tenerife South" },
  { iata: "SKG", city: "Thessaloniki", country: "Greece", name: "Thessaloniki Macedonia" },
  { iata: "HER", city: "Heraklion", country: "Greece", name: "Heraklion Nikos Kazantzakis" },
  { iata: "SPU", city: "Split", country: "Croatia", name: "Split" },
  { iata: "DBV", city: "Dubrovnik", country: "Croatia", name: "Dubrovnik" },
  { iata: "TLV", city: "Tel Aviv", country: "Israel", name: "Ben Gurion" },
  { iata: "CMN", city: "Casablanca", country: "Morocco", name: "Mohammed V" },
  { iata: "RAK", city: "Marrakech", country: "Morocco", name: "Marrakech Menara" },
  { iata: "AGP", city: "Malaga", country: "Spain", name: "Malaga-Costa del Sol" },
  { iata: "NCE", city: "Nice", country: "France", name: "Nice Côte d'Azur" },
  { iata: "BRU", city: "Brussels", country: "Belgium", name: "Brussels" },
  { iata: "EDI", city: "Edinburgh", country: "UK", name: "Edinburgh" },
  { iata: "MAN", city: "Manchester", country: "UK", name: "Manchester" },
];

export function searchAirports(query: string, limit = 10) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return AIRPORTS.filter(a =>
    a.iata.toLowerCase().includes(q) ||
    a.city.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q) ||
    a.country.toLowerCase().includes(q)
  ).slice(0, limit);
}
