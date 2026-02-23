/**
 * Flight Service - Mock Mode
 * Generates realistic flight offers when no external API key is configured.
 * RISK: In v1 we use mock data only. Real API integration is a V2 item.
 */

import { logApiCall } from "./db";

const AIRLINES = [
  { name: "Ryanair", code: "FR", logo: "https://logos.skyscnr.com/images/airlines/favicon/FR.png" },
  { name: "EasyJet", code: "U2", logo: "https://logos.skyscnr.com/images/airlines/favicon/U2.png" },
  { name: "Lufthansa", code: "LH", logo: "https://logos.skyscnr.com/images/airlines/favicon/LH.png" },
  { name: "Alitalia/ITA", code: "AZ", logo: "https://logos.skyscnr.com/images/airlines/favicon/AZ.png" },
  { name: "British Airways", code: "BA", logo: "https://logos.skyscnr.com/images/airlines/favicon/BA.png" },
  { name: "Air France", code: "AF", logo: "https://logos.skyscnr.com/images/airlines/favicon/AF.png" },
  { name: "KLM", code: "KL", logo: "https://logos.skyscnr.com/images/airlines/favicon/KL.png" },
  { name: "Vueling", code: "VY", logo: "https://logos.skyscnr.com/images/airlines/favicon/VY.png" },
  { name: "Wizz Air", code: "W6", logo: "https://logos.skyscnr.com/images/airlines/favicon/W6.png" },
  { name: "Turkish Airlines", code: "TK", logo: "https://logos.skyscnr.com/images/airlines/favicon/TK.png" },
  { name: "Emirates", code: "EK", logo: "https://logos.skyscnr.com/images/airlines/favicon/EK.png" },
  { name: "Swiss", code: "LX", logo: "https://logos.skyscnr.com/images/airlines/favicon/LX.png" },
];

interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travelers: number;
  currency: string;
  maxStops?: number;
  timePreference?: string;
  baggage?: boolean;
  budgetPerPerson?: number;
  tripStyle?: string;
}

interface FlightOffer {
  airline: string;
  airlineCode: string;
  airlineLogo: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  returnDepartureTime: string;
  returnArrivalTime: string;
  stops: number;
  returnStops: number;
  duration: string;
  returnDuration: string;
  flightPrice: number;
  hotelEstimate: number;
  activityEstimate: number;
  totalEstimate: number;
  dealScore: number;
  currency: string;
  bookingUrl: string;
  isEstimate: boolean;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateFlightTime(preference?: string): string {
  let hour: number;
  if (preference === "morning") hour = randomBetween(6, 11);
  else if (preference === "afternoon") hour = randomBetween(12, 17);
  else if (preference === "evening") hour = randomBetween(18, 23);
  else hour = randomBetween(6, 23);
  const min = [0, 15, 30, 45][randomBetween(0, 3)];
  return `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

function addDuration(time: string, durationMinutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMin = h * 60 + m + durationMinutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function estimateHotelPerNight(destination: string, tripStyle?: string): number {
  const baseRates: Record<string, number> = {
    LHR: 120, CDG: 110, BCN: 85, MAD: 75, AMS: 100, FRA: 95,
    MUC: 90, ZRH: 150, VIE: 80, IST: 55, ATH: 65, LIS: 70,
    DXB: 130, SIN: 110, HND: 120, BKK: 40, MLE: 180, JFK: 160,
    LAX: 140, MIA: 120, SFO: 150, SYD: 130, default: 80,
  };
  let base = baseRates[destination] ?? baseRates.default;
  if (tripStyle === "sea") base *= 1.1;
  if (tripStyle === "nature") base *= 0.85;
  if (tripStyle === "city") base *= 1.05;
  return Math.round(base + randomBetween(-15, 15));
}

function estimateActivitiesPerDay(destination: string, tripStyle?: string): number {
  let base = 30;
  if (tripStyle === "nature") base = 45;
  if (tripStyle === "city") base = 40;
  if (tripStyle === "sea") base = 25;
  return Math.round(base + randomBetween(-10, 10));
}

function calculateDealScore(
  flightPrice: number,
  budgetPerPerson: number | undefined,
  stops: number,
  maxStops: number | undefined,
  allPrices: number[]
): number {
  let score = 5.0;
  // Budget fit (0-3 points)
  if (budgetPerPerson && budgetPerPerson > 0) {
    const ratio = flightPrice / budgetPerPerson;
    if (ratio <= 0.3) score += 3;
    else if (ratio <= 0.5) score += 2;
    else if (ratio <= 0.7) score += 1;
    else if (ratio > 1) score -= 2;
  }
  // Relative cheapness (0-2 points)
  if (allPrices.length > 1) {
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const range = max - min || 1;
    const cheapness = 1 - (flightPrice - min) / range;
    score += cheapness * 2;
  }
  // Stop penalty
  if (stops === 0) score += 0.5;
  if (maxStops !== undefined && stops > maxStops) score -= 1.5;
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

export async function searchFlights(params: SearchParams): Promise<FlightOffer[]> {
  const startTime = Date.now();
  try {
    // Simulate API delay
    await new Promise(r => setTimeout(r, randomBetween(500, 1500)));

    const numOffers = randomBetween(5, 10);
    const selectedAirlines = [...AIRLINES].sort(() => Math.random() - 0.5).slice(0, numOffers);

    const departDate = new Date(params.departureDate);
    const returnDate = new Date(params.returnDate);
    const tripDays = Math.max(1, Math.ceil((returnDate.getTime() - departDate.getTime()) / (1000 * 60 * 60 * 24)));

    const rawOffers = selectedAirlines.map((airline) => {
      const isLowCost = ["FR", "U2", "W6", "VY"].includes(airline.code);
      const basePrice = isLowCost ? randomBetween(25, 120) : randomBetween(80, 400);
      const stops = isLowCost ? (Math.random() > 0.7 ? 1 : 0) : randomBetween(0, 2);
      const returnStops = isLowCost ? (Math.random() > 0.7 ? 1 : 0) : randomBetween(0, 2);
      const baseDuration = randomBetween(90, 240) + stops * randomBetween(60, 120);
      const returnDuration = randomBetween(90, 240) + returnStops * randomBetween(60, 120);

      const depTime = generateFlightTime(params.timePreference);
      const arrTime = addDuration(depTime, baseDuration);
      const retDepTime = generateFlightTime(params.timePreference);
      const retArrTime = addDuration(retDepTime, returnDuration);

      const flightPrice = Math.round(basePrice * params.travelers);
      const hotelNight = estimateHotelPerNight(params.destination, params.tripStyle);
      const activityDay = estimateActivitiesPerDay(params.destination, params.tripStyle);
      const hotelEstimate = Math.round(hotelNight * tripDays * Math.ceil(params.travelers / 2));
      const activityEstimate = Math.round(activityDay * tripDays * params.travelers);

      return {
        airline: airline.name,
        airlineCode: airline.code,
        airlineLogo: airline.logo,
        flightNumber: `${airline.code}${randomBetween(100, 9999)}`,
        departureTime: depTime,
        arrivalTime: arrTime,
        returnDepartureTime: retDepTime,
        returnArrivalTime: retArrTime,
        stops,
        returnStops,
        duration: formatDuration(baseDuration),
        returnDuration: formatDuration(returnDuration),
        flightPrice,
        hotelEstimate,
        activityEstimate,
        totalEstimate: flightPrice + hotelEstimate + activityEstimate,
        dealScore: 0,
        currency: params.currency,
        bookingUrl: `https://www.google.com/travel/flights?q=${params.origin}+to+${params.destination}&utm_source=trippulse&utm_medium=referral`,
        isEstimate: true,
      };
    });

    // Calculate deal scores
    const allPrices = rawOffers.map(o => o.flightPrice);
    for (const offer of rawOffers) {
      offer.dealScore = calculateDealScore(
        offer.flightPrice,
        params.budgetPerPerson,
        offer.stops,
        params.maxStops,
        allPrices
      );
    }

    // Sort by deal score descending
    rawOffers.sort((a, b) => b.dealScore - a.dealScore);

    await logApiCall({
      endpoint: "/mock/search_flights",
      method: "POST",
      statusCode: 200,
      requestBody: params as any,
      responseBody: { count: rawOffers.length } as any,
      durationMs: Date.now() - startTime,
    });

    return rawOffers;
  } catch (error: any) {
    await logApiCall({
      endpoint: "/mock/search_flights",
      method: "POST",
      statusCode: 500,
      requestBody: params as any,
      errorMessage: error.message,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}
