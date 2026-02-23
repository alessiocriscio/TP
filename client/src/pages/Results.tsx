import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTrip } from "@/contexts/TripContext";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, RefreshCw, Plane, Clock, Star, ArrowRight, Loader2, Bookmark, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function DealScoreBadge({ score }: { score: number }) {
  const s = Number(score);
  let color = "deal-fair";
  let label = "Fair";
  if (s >= 8) { color = "deal-excellent"; label = "Excellent"; }
  else if (s >= 6) { color = "deal-good"; label = "Good"; }
  else if (s < 4) { color = "deal-poor"; label = "Low"; }
  return (
    <div className={cn("flex items-center gap-1 text-xs font-bold", color)}>
      <Star className="w-3.5 h-3.5 fill-current" />
      {s.toFixed(1)}
    </div>
  );
}

export default function Results() {
  const [, params] = useRoute("/results/:tripId");
  const tripId = params?.tripId;
  const [, navigate] = useLocation();
  const { t, currencySymbol } = useLanguage();
  const { offers, setOffers, tripParams, setSelectedOffer } = useTrip();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const refreshMutation = trpc.offers.refresh.useMutation();
  const saveMutation = trpc.saved.save.useMutation();

  const sortedOffers = useMemo(() => {
    return [...offers].sort((a, b) => Number(b.dealScore) - Number(a.dealScore));
  }, [offers]);

  const bestDealIdx = sortedOffers.length > 0 ? 0 : -1;

  const handleRefresh = async () => {
    if (!tripId || !tripParams.origin || !tripParams.destination) return;
    setRefreshing(true);
    try {
      const result = await refreshMutation.mutateAsync({
        tripUniqueId: tripId,
        origin: tripParams.origin,
        destination: tripParams.destination,
        departureDate: tripParams.departureDate!,
        returnDate: tripParams.returnDate!,
        travelers: tripParams.travelers ?? 1,
        currency: tripParams.currency ?? "EUR",
        maxStops: tripParams.maxStops,
        timePreference: tripParams.timePreference,
        baggage: tripParams.baggage,
        budgetPerPerson: tripParams.totalBudget ? tripParams.totalBudget / (tripParams.travelers ?? 1) : undefined,
        tripStyle: tripParams.tripStyle,
      });
      setOffers(result.offers);
      if (result.rateLimited) {
        toast.info("Rate limited - showing cached results");
      } else {
        toast.success(t("refreshPrices") + " ✓");
      }
    } catch (e: any) {
      toast.error(t("error"));
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async (offer: any, idx: number) => {
    if (!isAuthenticated) {
      toast.info(t("loginToSave"));
      return;
    }
    try {
      // We need the DB offer ID - for now use trip request
      const trip = await trpc.useUtils().client.trips.get.query({ uniqueId: tripId! });
      if (trip) {
        await saveMutation.mutateAsync({
          tripRequestId: trip.id,
          name: `${tripParams.originCity} → ${tripParams.destinationCity}`,
        });
        toast.success(t("tripSaved"));
      }
    } catch {
      toast.error(t("error"));
    }
  };

  // Budget bar
  const budgetUsed = sortedOffers.length > 0 ? Number(sortedOffers[0].totalEstimate ?? sortedOffers[0].flightPrice) : 0;
  const budgetTotal = tripParams.totalBudget ?? 0;
  const budgetPct = budgetTotal > 0 ? Math.min(100, (budgetUsed / budgetTotal) * 100) : 0;

  if (sortedOffers.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <Plane className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">{t("noResults")}</p>
        <Button variant="outline" onClick={() => navigate("/chat")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate("/chat")} className="p-1.5 rounded-lg hover:bg-secondary">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold">
                {tripParams.originCity} → {tripParams.destinationCity}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {tripParams.departureDate} — {tripParams.returnDate} · {tripParams.travelers} {t("travelers")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5"
          >
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {refreshing ? t("refreshing") : t("refreshPrices")}
          </Button>
        </div>

        {/* Budget bar */}
        {budgetTotal > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>{t("totalBudget")}: {currencySymbol}{budgetTotal}</span>
              <span>{Math.round(budgetPct)}%</span>
            </div>
            <Progress value={budgetPct} className="h-1.5" />
          </div>
        )}
      </header>

      {/* Results count */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{sortedOffers.length} {t("results")}</span>
          <Badge variant="secondary" className="text-[10px]">{t("estimated")}</Badge>
        </div>
      </div>

      {/* Offer Cards */}
      <div className="px-4 space-y-3">
        {sortedOffers.map((offer: any, idx: number) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card
              className={cn(
                "p-4 cursor-pointer hover:shadow-md transition-all duration-200 relative overflow-hidden",
                idx === bestDealIdx && "ring-2 ring-primary/30"
              )}
              onClick={() => {
                setSelectedOffer(offer);
                navigate(`/offer/${tripId}/${idx}`);
              }}
            >
              {idx === bestDealIdx && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                  {t("bestDeal")}
                </div>
              )}

              {/* Airline + Deal Score */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                    {offer.airlineLogo ? (
                      <img src={offer.airlineLogo} alt="" className="w-6 h-6 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <Plane className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{offer.airline}</p>
                    <p className="text-[10px] text-muted-foreground">{offer.flightNumber}</p>
                  </div>
                </div>
                <DealScoreBadge score={offer.dealScore} />
              </div>

              {/* Flight Times */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">{t("outbound")}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{offer.departureTime}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-semibold">{offer.arrivalTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{offer.duration}</span>
                    <span>{offer.stops === 0 ? t("direct") : `${offer.stops} ${offer.stops === 1 ? t("stop") : t("stops")}`}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium">{t("returnFlight")}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">{offer.returnDepartureTime}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm font-semibold">{offer.returnArrivalTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{offer.returnDuration}</span>
                    <span>{offer.returnStops === 0 ? t("direct") : `${offer.returnStops} ${offer.returnStops === 1 ? t("stop") : t("stops")}`}</span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-end justify-between pt-2 border-t border-border">
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {currencySymbol}{Number(offer.flightPrice).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("flights")} · {t("perPerson")}</p>
                </div>
                {offer.totalEstimate && (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-muted-foreground">
                      {currencySymbol}{Number(offer.totalEstimate).toFixed(0)}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      {t("totalTrip")} <Badge variant="outline" className="text-[8px] px-1 py-0">{t("estimated")}</Badge>
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
