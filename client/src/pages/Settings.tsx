import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LANGUAGES, CURRENCIES } from "@shared/i18n";
import { getLoginUrl } from "@/const";
import {
  Globe, DollarSign, PieChart, Shield,
  LogIn, LogOut, ChevronRight, User, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_LABELS: Record<string, { label: string; light: string; dark: string }> = {
  it: { label: "Tema",   light: "☀️ Tema chiaro attivo",  dark: "🌙 Tema scuro attivo"   },
  en: { label: "Theme",  light: "☀️ Light theme active",  dark: "🌙 Dark theme active"    },
  es: { label: "Tema",   light: "☀️ Tema claro activo",   dark: "🌙 Tema oscuro activo"   },
  de: { label: "Design", light: "☀️ Helles Design aktiv", dark: "🌙 Dunkles Design aktiv" },
  fr: { label: "Thème",  light: "☀️ Thème clair actif",   dark: "🌙 Thème sombre actif"   },
};

function LegalSheet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="w-full flex items-center justify-between py-3 px-1 hover:bg-secondary/50 rounded-lg transition-colors">
          <span className="text-sm">{title}</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
        <div className="prose prose-sm max-w-none mt-4 text-sm text-muted-foreground">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export default function Settings() {
  const { t, lang, setLang, currency, setCurrency } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [flightSplit, setFlightSplit] = useState(50);
  const [hotelSplit, setHotelSplit] = useState(35);
  const activitySplit = 100 - flightSplit - hotelSplit;
  const themeLabels = THEME_LABELS[lang] ?? THEME_LABELS["en"];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="px-4 pt-4 pb-3 safe-top">
        <h1 className="text-xl font-bold">{t("settings")}</h1>
      </header>

      <div className="px-4 space-y-4 max-w-lg mx-auto">
        {/* User Profile */}
        <Card className="p-4">
          {isAuthenticated ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{user?.name ?? "User"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1.5">
                <LogOut className="w-3.5 h-3.5" />{t("logout")}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{t("loginToSave")}</p>
              <Button size="sm" asChild className="gap-1.5">
                <a href={getLoginUrl()}><LogIn className="w-3.5 h-3.5" />{t("login")}</a>
              </Button>
            </div>
          )}
        </Card>

        {/* Language */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("language")}</h3>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                className={cn("flex flex-col items-center gap-1 p-2 rounded-xl text-xs transition-all",
                  lang === l.code
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}>
                <span className="text-base">{l.flag}</span>
                <span className="text-[10px]">{l.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Theme */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
              <h3 className="text-sm font-semibold">{themeLabels.label}</h3>
            </div>
            <button
              onClick={toggleTheme}
              className={cn(
                "relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner",
                theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"
              )}
              aria-label="Toggle tema"
            >
              <Sun className={cn("absolute left-1.5 w-4 h-4 transition-opacity",
                theme === "dark" ? "opacity-0" : "opacity-100 text-yellow-500")} />
              <Moon className={cn("absolute right-1.5 w-4 h-4 transition-opacity",
                theme === "dark" ? "opacity-100 text-white" : "opacity-0")} />
              <span className={cn(
                "absolute inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300",
                theme === "dark" ? "translate-x-9" : "translate-x-1"
              )} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {theme === "dark" ? themeLabels.dark : themeLabels.light}
          </p>
        </Card>

        {/* Currency */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("currency")}</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CURRENCIES.map(c => (
              <button key={c.code} onClick={() => setCurrency(c.code)}
                className={cn("flex flex-col items-center gap-0.5 p-2 rounded-xl text-xs transition-all",
                  currency === c.code
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}>
                <span className="text-base font-bold">{c.symbol}</span>
                <span className="text-[10px]">{c.code}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Budget Split */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("budgetSplit")}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span>{t("flights")}</span><span className="font-semibold">{flightSplit}%</span>
              </div>
              <Slider value={[flightSplit]} onValueChange={([v]) => { setFlightSplit(v); if (v + hotelSplit > 100) setHotelSplit(100 - v); }} max={80} min={20} step={5} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span>{t("hotels")}</span><span className="font-semibold">{hotelSplit}%</span>
              </div>
              <Slider value={[hotelSplit]} onValueChange={([v]) => { setHotelSplit(v); if (flightSplit + v > 100) setFlightSplit(100 - v); }} max={60} min={10} step={5} />
            </div>
            <div className="flex justify-between text-xs">
              <span>{t("activities")}</span><span className="font-semibold">{Math.max(0, activitySplit)}%</span>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden">
              <div className="bg-primary" style={{ width: `${flightSplit}%` }} />
              <div className="bg-chart-2" style={{ width: `${hotelSplit}%` }} />
              <div className="bg-chart-3" style={{ width: `${Math.max(0, activitySplit)}%` }} />
            </div>
          </div>
        </Card>

        {/* Legal */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Legal</h3>
          </div>
          <div className="divide-y divide-border">
            <LegalSheet title={t("privacyPolicy")}>
              <p className="text-xs text-destructive font-medium mb-2">DRAFT - Not legally binding</p>
              <p>TripPulse collects minimal personal data to provide travel planning services.</p>
              <p className="mt-2">We do not sell your data to third parties. Booking links may redirect to third-party sites with affiliate tracking parameters.</p>
              <p className="mt-2">You can delete your account and all associated data at any time by contacting us.</p>
            </LegalSheet>
            <LegalSheet title={t("termsOfService")}>
              <p className="text-xs text-destructive font-medium mb-2">DRAFT - Not legally binding</p>
              <p>TripPulse is a travel planning tool that provides flight search results and price estimates.</p>
              <p className="mt-2">We are not a travel agency. All bookings are completed through third-party partner sites.</p>
              <p className="mt-2">The service is provided "as is" without warranties.</p>
            </LegalSheet>
            <LegalSheet title={t("affiliateInfo")}>
              <p className="text-xs text-destructive font-medium mb-2">DRAFT - Not legally binding</p>
              <p>TripPulse may earn commissions from bookings made through our partner links. This does not affect the prices you see or pay.</p>
            </LegalSheet>
          </div>
        </Card>

        {/* Version */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>TripPulse v1.0.0 (MVP)</p>
          <p className="mt-1">Made with AI</p>
        </div>
      </div>
    </div>
  );
}
