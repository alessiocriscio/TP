/**
 * Trip Chat API - LLM-powered conversational trip intake
 * Uses AI SDK v6 with streaming for natural language trip planning
 */

import {
  streamText, stepCountIs, tool, convertToModelMessages,
  createUIMessageStream, pipeUIMessageStreamToResponse, generateId,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import type { Express } from "express";
import { z } from "zod/v4";
import { ENV } from "./_core/env";
import { createPatchedFetch } from "./_core/patchedFetch";

function createLLMProvider() {
  const baseURL = ENV.forgeApiUrl.endsWith("/v1")
    ? ENV.forgeApiUrl
    : `${ENV.forgeApiUrl}/v1`;
  return createOpenAI({
    baseURL,
    apiKey: ENV.forgeApiKey,
    fetch: createPatchedFetch(fetch),
  });
}

const SYSTEM_PROMPTS: Record<string, string> = {
  en: `You are TripPulse, a friendly and expert travel planning assistant. Your goal is to help users plan their perfect trip by gathering key information through natural conversation.

You need to collect:
1. **Origin** - Where they're flying from (airport/city)
2. **Destination** - Where they want to go (or suggest destinations if unknown)
3. **Dates** - Departure and return dates
4. **Travelers** - Number of people
5. **Budget** - Total budget and whether it's flights-only or total trip
6. **Preferences** - Trip style (beach, city, nature, mixed), max stops, time preferences, baggage needs

Guidelines:
- Be conversational and enthusiastic but concise
- If the user doesn't know the destination, ask about their trip style (beach/city/nature/mixed) and suggest 3-4 destinations
- Always confirm details before searching
- Use the extractTripParams tool when you have enough info to search
- Respond in the user's language
- Keep responses SHORT (2-3 sentences max per message)
- Use emojis sparingly for friendliness
- If user gives partial info, ask for the missing pieces one at a time
- Format dates as YYYY-MM-DD
- For airports, use IATA codes when possible
- Today's date is ${new Date().toISOString().split("T")[0]}`,

  it: `Sei TripPulse, un assistente di viaggio amichevole ed esperto. Il tuo obiettivo è aiutare gli utenti a pianificare il viaggio perfetto raccogliendo informazioni chiave attraverso una conversazione naturale.

Devi raccogliere:
1. **Origine** - Da dove partono (aeroporto/città)
2. **Destinazione** - Dove vogliono andare (o suggerisci destinazioni se non sanno)
3. **Date** - Partenza e ritorno
4. **Viaggiatori** - Numero di persone
5. **Budget** - Budget totale e se è solo voli o viaggio completo
6. **Preferenze** - Stile viaggio (mare, città, natura, misto), scali massimi, preferenze orario, bagaglio

Linee guida:
- Sii conversazionale ed entusiasta ma conciso
- Se l'utente non conosce la destinazione, chiedi lo stile di viaggio e suggerisci 3-4 destinazioni
- Conferma sempre i dettagli prima di cercare
- Usa lo strumento extractTripParams quando hai abbastanza info
- Rispondi nella lingua dell'utente
- Risposte BREVI (2-3 frasi max)
- Usa emoji con parsimonia
- Formatta le date come YYYY-MM-DD
- Per gli aeroporti, usa i codici IATA
- La data di oggi è ${new Date().toISOString().split("T")[0]}`,

  es: `Eres TripPulse, un asistente de viaje amigable y experto. Tu objetivo es ayudar a los usuarios a planificar su viaje perfecto recopilando información clave a través de una conversación natural.

Necesitas recopilar: origen, destino, fechas, viajeros, presupuesto y preferencias.
Sé conversacional, conciso y responde en español. Usa extractTripParams cuando tengas suficiente información.
La fecha de hoy es ${new Date().toISOString().split("T")[0]}`,

  de: `Du bist TripPulse, ein freundlicher und erfahrener Reiseplanungsassistent. Dein Ziel ist es, Nutzern bei der Planung ihrer perfekten Reise zu helfen.

Sammle: Abflugort, Ziel, Daten, Reisende, Budget und Präferenzen.
Sei gesprächig, kurz und antworte auf Deutsch. Nutze extractTripParams wenn du genug Infos hast.
Heutiges Datum: ${new Date().toISOString().split("T")[0]}`,

  fr: `Tu es TripPulse, un assistant de voyage amical et expert. Ton objectif est d'aider les utilisateurs à planifier leur voyage parfait.

Collecte: origine, destination, dates, voyageurs, budget et préférences.
Sois conversationnel, concis et réponds en français. Utilise extractTripParams quand tu as assez d'infos.
Date d'aujourd'hui: ${new Date().toISOString().split("T")[0]}`,
};

const tripTools = {
  extractTripParams: tool({
    description: "Extract and confirm trip parameters from the conversation. Call this when you have enough information to search for flights.",
    inputSchema: z.object({
      origin: z.string().describe("Origin airport IATA code, e.g. FCO"),
      originCity: z.string().describe("Origin city name"),
      destination: z.string().describe("Destination airport IATA code"),
      destinationCity: z.string().describe("Destination city name"),
      departureDate: z.string().describe("Departure date in YYYY-MM-DD format"),
      returnDate: z.string().describe("Return date in YYYY-MM-DD format"),
      travelers: z.number().describe("Number of travelers"),
      tripStyle: z.enum(["sea", "city", "nature", "mixed"]).optional().describe("Trip style preference"),
      totalBudget: z.number().optional().describe("Total budget in user's currency"),
      budgetType: z.enum(["flights_only", "total_trip"]).optional(),
      currency: z.string().optional().default("EUR"),
      maxStops: z.number().optional(),
      timePreference: z.enum(["anytime", "morning", "afternoon", "evening"]).optional(),
      baggage: z.boolean().optional(),
    }),
    execute: async (params) => {
      return {
        status: "ready",
        params,
        message: "Trip parameters extracted successfully. Ready to search!",
      };
    },
  }),

  suggestDestinations: tool({
    description: "Suggest travel destinations based on user preferences",
    inputSchema: z.object({
      tripStyle: z.enum(["sea", "city", "nature", "mixed"]),
      budget: z.enum(["low", "medium", "high"]).optional(),
      fromRegion: z.string().optional().describe("User's region for proximity"),
    }),
    execute: async ({ tripStyle }) => {
      const suggestions: Record<string, Array<{ city: string; iata: string; reason: string }>> = {
        sea: [
          { city: "Barcelona", iata: "BCN", reason: "Beautiful beaches and vibrant culture" },
          { city: "Heraklion (Crete)", iata: "HER", reason: "Crystal clear waters and ancient history" },
          { city: "Palma de Mallorca", iata: "PMI", reason: "Stunning Mediterranean coastline" },
          { city: "Malé (Maldives)", iata: "MLE", reason: "Paradise islands and luxury resorts" },
        ],
        city: [
          { city: "London", iata: "LHR", reason: "World-class museums and culture" },
          { city: "Paris", iata: "CDG", reason: "Art, cuisine and romance" },
          { city: "Istanbul", iata: "IST", reason: "Where East meets West" },
          { city: "Tokyo", iata: "HND", reason: "Tradition meets futurism" },
        ],
        nature: [
          { city: "Reykjavik", iata: "KEF", reason: "Northern lights and geysers" },
          { city: "Marrakech", iata: "RAK", reason: "Atlas Mountains and desert" },
          { city: "Colombo", iata: "CMB", reason: "Tropical forests and wildlife" },
          { city: "Oslo", iata: "OSL", reason: "Fjords and Nordic wilderness" },
        ],
        mixed: [
          { city: "Lisbon", iata: "LIS", reason: "City charm with nearby beaches" },
          { city: "Dubrovnik", iata: "DBV", reason: "Historic city on the Adriatic" },
          { city: "Nice", iata: "NCE", reason: "Riviera glamour and mountain hikes" },
          { city: "Bangkok", iata: "BKK", reason: "Temples, food and island escapes" },
        ],
      };
      return suggestions[tripStyle] ?? suggestions.mixed;
    },
  }),
};

export function registerTripChatRoutes(app: Express) {
  const openai = createLLMProvider();

  app.post("/api/trip-chat", async (req, res) => {
    try {
      const { message, messages: rawMessages, language = "en" } = req.body;

      // Support both patterns: { message } (single latest) and { messages } (full history)
      let uiMessages = rawMessages;
      if (!uiMessages || !Array.isArray(uiMessages)) {
        res.status(400).json({ error: "messages array is required" });
        return;
      }

      const systemPrompt = SYSTEM_PROMPTS[language] ?? SYSTEM_PROMPTS.en;

      // Convert UIMessages to ModelMessages for the LLM
      const modelMessages = await convertToModelMessages(uiMessages);

      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({ type: "start", messageId: generateId() });

          const result = streamText({
            model: openai.chat("gemini-2.5-flash"),
            system: systemPrompt,
            messages: modelMessages,
            tools: tripTools,
            stopWhen: stepCountIs(3),
          });

          result.consumeStream();
          writer.merge(result.toUIMessageStream({ sendStart: false }));
        },
      });

      pipeUIMessageStreamToResponse({ response: res, stream });
    } catch (error) {
      console.error("[/api/trip-chat] Error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });
}
