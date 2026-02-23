import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface TripParams {
  origin?: string;
  originCity?: string;
  destination?: string;
  destinationCity?: string;
  departureDate?: string;
  returnDate?: string;
  travelers?: number;
  tripStyle?: string;
  budgetType?: "flights_only" | "total_trip";
  totalBudget?: number;
  currency?: string;
  flightSplit?: number;
  hotelSplit?: number;
  activitySplit?: number;
  maxStops?: number;
  timePreference?: string;
  baggage?: boolean;
  flexibility?: string;
}

interface TripContextType {
  tripParams: TripParams;
  setTripParams: (params: TripParams) => void;
  updateTripParams: (partial: Partial<TripParams>) => void;
  tripUniqueId: string | null;
  setTripUniqueId: (id: string | null) => void;
  offers: any[];
  setOffers: (offers: any[]) => void;
  selectedOffer: any | null;
  setSelectedOffer: (offer: any | null) => void;
  resetTrip: () => void;
}

const TripContext = createContext<TripContextType | null>(null);

const DEFAULT_PARAMS: TripParams = {
  travelers: 1,
  budgetType: "total_trip",
  currency: "EUR",
  flightSplit: 50,
  hotelSplit: 35,
  activitySplit: 15,
};

export function TripProvider({ children }: { children: ReactNode }) {
  const [tripParams, setTripParams] = useState<TripParams>(DEFAULT_PARAMS);
  const [tripUniqueId, setTripUniqueId] = useState<string | null>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<any | null>(null);

  const updateTripParams = useCallback((partial: Partial<TripParams>) => {
    setTripParams(prev => ({ ...prev, ...partial }));
  }, []);

  const resetTrip = useCallback(() => {
    setTripParams(DEFAULT_PARAMS);
    setTripUniqueId(null);
    setOffers([]);
    setSelectedOffer(null);
  }, []);

  return (
    <TripContext.Provider value={{
      tripParams, setTripParams, updateTripParams,
      tripUniqueId, setTripUniqueId,
      offers, setOffers,
      selectedOffer, setSelectedOffer,
      resetTrip,
    }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
