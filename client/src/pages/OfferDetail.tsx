import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTrip } from "@/contexts/TripContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Plane, Clock, Star, ExternalLink, Bookmark,
  ArrowRight, Hotel, Compass, AlertTriangle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function OfferDetail() {
  const [, params] = useRoute("/offer/:tripId/:idx");
  const [, navigate] = useLocation();
  const { t, currencySymbol } = useLanguage();
  const { offers, tripParams, selectedOffer } = useTrip();
  const { isAuthenticated } = useAuth();
  const saveMutation = trpc.saved.save.useMutation();

  const idx = parseInt(params?.idx ?? "0");
  const offer = selectedOffer ?? offers[idx];

  if (!offer) {
    navigate("/");
    return null;
  }

  const flightPrice = Number(offer.flightPrice ?? 0);
  const hotelEst = Number(offer.hotelEstimate ?? 0);
  const activityEst = Number(offer.activityEstimate ?? 0);
  const totalEst = Number(offer.totalEstimate ?? flightPrice + hotelEst + activityEst);
  const dealScore = Number(offer.dealScore ?? 5);

  const budget = tripParams.totalBudget ?? 0;
  const budgetPct = budget > 0 ? Math.min(100, (totalEst / budget) * 100) : 0;

  const handleSave = async () => {
    if (!isAuthenticated) {
      toast.info(t("loginToSave"));
      return;
    }
    try {
      const trip = await trpc.useUtils().client.trips.get.query({ uniqueId: params?.tripId! });
      if (trip) {
        await saveMutation.mutateAsync({
          tripRequestId: trip.id,
          name: `${tripParams.originCity} → ${tripParams.destinationCity} (${offer.airline})`,
        });
        toast.success(t("tripSaved"));
      }
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1 as any)} className="p-1.5 rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold">{t("flightDetails")}</h1>
            <p className="text-[10px] text-muted-foreground">{offer.airline} · {offer.flightNumber}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSave} className="h-8 gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            {t("saveTrip")}
          </Button>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Deal Score Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center overflow-hidden">
                  {offer.airlineLogo ? (
                    <img src={offer.airlineLogo} alt="" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <Plane className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{offer.airline}</p>
                  <p className="text-xs text-muted-foreground">{offer.flightNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "flex items-center gap-1 text-lg font-bold",
                  dealScore >= 8 ? "deal-excellent" : dealScore >= 6 ? "deal-good" : dealScore >= 4 ? "deal-fair" : "deal-poor"
                )}>
                  <Star className="w-5 h-5 fill-current" />
                  {dealScore.toFixed(1)}
                </div>
                <p className="text-[10px] text-muted-foreground">{t("dealScore")}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Outbound Flight */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">{t("outbound")}</h3>
              <Badge variant="outline" className="text-[10px]">{tripParams.departureDate}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold">{offer.departureTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{tripParams.origin}</p>
              </div>
              <div className="flex-1 px-4">
                <div className="relative">
                  <div className="border-t-2 border-dashed border-border" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {offer.duration}
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-muted-foreground mt-1">
                  {offer.stops === 0 ? t("direct") : `${offer.stops} ${offer.stops === 1 ? t("stop") : t("stops")}`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{offer.arrivalTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{tripParams.destination}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Return Flight */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Plane className="w-4 h-4 text-primary rotate-180" />
              <h3 className="text-sm font-semibold">{t("returnFlight")}</h3>
              <Badge variant="outline" className="text-[10px]">{tripParams.returnDate}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-2xl font-bold">{offer.returnDepartureTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{tripParams.destination}</p>
              </div>
              <div className="flex-1 px-4">
                <div className="relative">
                  <div className="border-t-2 border-dashed border-border" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {offer.returnDuration}
                    </div>
                  </div>
                </div>
                <p className="text-center text-[10px] text-muted-foreground mt-1">
                  {(offer.returnStops ?? 0) === 0 ? t("direct") : `${offer.returnStops} ${(offer.returnStops ?? 0) === 1 ? t("stop") : t("stops")}`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{offer.returnArrivalTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{tripParams.origin}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Price Breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">{t("budgetBreakdown")}</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-primary" />
                  <span className="text-sm">{t("flights")}</span>
                </div>
                <span className="text-sm font-semibold">{currencySymbol}{flightPrice.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-chart-2" />
                  <span className="text-sm">{t("hotels")}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">{t("estimated")}</Badge>
                </div>
                <span className="text-sm font-semibold">{currencySymbol}{hotelEst.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-chart-3" />
                  <span className="text-sm">{t("activities")}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0">{t("estimated")}</Badge>
                </div>
                <span className="text-sm font-semibold">{currencySymbol}{activityEst.toFixed(0)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{t("totalTrip")}</span>
                <span className="text-lg font-bold text-primary">{currencySymbol}{totalEst.toFixed(0)}</span>
              </div>

              {budget > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{t("totalBudget")}: {currencySymbol}{budget}</span>
                    <span>{Math.round(budgetPct)}%</span>
                  </div>
                  <Progress value={budgetPct} className="h-1.5" />
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-secondary/50 text-xs text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{t("priceDisclaimer")}</p>
          </div>
        </motion.div>

        {/* Book CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold rounded-2xl gap-2"
            onClick={() => {
              const url = offer.bookingUrl || `https://www.google.com/travel/flights`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            {t("openBooking")}
            <ExternalLink className="w-4 h-4" />
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            {t("affiliateDisclosure")}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
