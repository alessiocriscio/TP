import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Bookmark, Trash2, Plane, Calendar, Loader2, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export default function SavedTrips() {
  const { t } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const savedQuery = trpc.saved.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const deleteMutation = trpc.saved.delete.useMutation({
    onSuccess: () => {
      savedQuery.refetch();
      toast.success(t("deleteSaved") + " ✓");
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Bookmark className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold mb-2">{t("savedTrips")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
          {t("savedTripsGuest")}
        </p>
        <Button asChild className="gap-2">
          <a href={getLoginUrl()}>
            <LogIn className="w-4 h-4" />
            {t("login")}
          </a>
        </Button>
      </div>
    );
  }

  const trips = savedQuery.data ?? [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="px-4 pt-4 pb-3 safe-top">
        <h1 className="text-xl font-bold">{t("savedTrips")}</h1>
      </header>

      {savedQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : trips.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Bookmark className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noSavedTrips")}</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          <AnimatePresence>
            {trips.map((trip: any) => (
              <motion.div
                key={trip.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                layout
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Plane className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold">{trip.name ?? "Trip"}</h3>
                      </div>
                      {trip.notes && (
                        <p className="text-xs text-muted-foreground mb-1">{trip.notes}</p>
                      )}
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: trip.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
