import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES } from "@shared/i18n";
import { Plane, Sparkles, Globe, ArrowRight, Shield } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 safe-top">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">TripPulse</span>
        </div>
        {/* Language Quick Select */}
        <div className="flex items-center gap-1">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                lang === l.code
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {l.code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto"
        >
          {/* Animated Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6"
          >
            <Sparkles className="w-10 h-10 text-primary" />
          </motion.div>

          <h1 className="text-3xl font-extrabold text-foreground mb-3 tracking-tight">
            {t("appName")}
          </h1>
          <p className="text-lg text-primary font-semibold mb-2">
            {t("tagline")}
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            {t("subtitle")}
          </p>

          {/* CTA */}
          <Button
            size="lg"
            onClick={() => navigate("/chat")}
            className="w-full max-w-xs mx-auto h-14 text-base font-semibold rounded-2xl shadow-lg shadow-primary/20 gap-2"
          >
            {t("startPlanning")}
            <ArrowRight className="w-5 h-5" />
          </Button>

          {/* Auth state */}
          {isAuthenticated ? (
            <p className="text-sm text-muted-foreground mt-4">
              {t("welcome")},{" "}
              <span className="font-medium text-foreground">
                {user?.name ?? "User"}
              </span>
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate("/chat")}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("continueAsGuest")}
              </button>
              <div className="flex items-center justify-center gap-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <a
                  href={getLoginUrl()}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {t("loginToSave")}
                </a>
              </div>
            </div>
          )}
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mt-10 max-w-sm"
        >
          {[
            { icon: Globe, label: "5 " + t("languages").toLowerCase() },
            { icon: Plane, label: "75+ airports" },
            { icon: Sparkles, label: "AI-powered" },
          ].map((feat, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
            >
              <feat.icon className="w-3.5 h-3.5" />
              {feat.label}
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
