import { useLocation, Link } from "wouter";
import { Home, MessageSquare, Bookmark, Settings } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/", icon: Home, labelKey: "home" as const },
  { path: "/chat", icon: MessageSquare, labelKey: "search" as const },
  { path: "/saved", icon: Bookmark, labelKey: "trips" as const },
  { path: "/settings", icon: Settings, labelKey: "settings" as const },
];

export function BottomNav() {
  const [location] = useLocation();
  const { t } = useLanguage();

  // Hide on results/detail pages
  if (location.startsWith("/results") || location.startsWith("/offer/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {NAV_ITEMS.map(({ path, icon: Icon, labelKey }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <Link key={path} href={path}>
              <button className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}>
                <Icon className={cn("w-5 h-5", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{t(labelKey)}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
