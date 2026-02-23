import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { TripProvider } from "./contexts/TripContext";
import { BottomNav } from "./components/BottomNav";
import Home from "./pages/Home";
import ChatIntake from "./pages/ChatIntake";
import Results from "./pages/Results";
import OfferDetail from "./pages/OfferDetail";
import SavedTrips from "./pages/SavedTrips";
import Settings from "./pages/Settings";
import { useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={ChatIntake} />
      <Route path="/results/:tripId" component={Results} />
      <Route path="/offer/:tripId/:idx" component={OfferDetail} />
      <Route path="/saved" component={SavedTrips} />
      <Route path="/settings" component={Settings} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed silently
      });
    }
  }, []);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <LanguageProvider>
          <TripProvider>
            <TooltipProvider>
              <Toaster />
              <ServiceWorkerRegistrar />

              <div
                className="pb-16"
                style={{
                  paddingBottom: "calc(4rem + env(safe-area-inset-bottom))",
                }}
              >
                <Router />
              </div>

              <BottomNav />
            </TooltipProvider>
          </TripProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
