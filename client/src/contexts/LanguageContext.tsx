import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Language, TranslationKey, t as translate, LANGUAGES, CURRENCIES } from "@shared/i18n";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  currency: string;
  setCurrency: (c: string) => void;
  currencySymbol: string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

function getStoredLang(): Language {
  try {
    const stored = localStorage.getItem("trippulse_lang");
    if (stored && ["it", "en", "es", "de", "fr"].includes(stored)) return stored as Language;
    const browserLang = navigator.language.split("-")[0];
    if (["it", "en", "es", "de", "fr"].includes(browserLang)) return browserLang as Language;
  } catch {}
  return "en";
}

function getStoredCurrency(): string {
  try {
    return localStorage.getItem("trippulse_currency") ?? "EUR";
  } catch {}
  return "EUR";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(getStoredLang);
  const [currency, setCurrencyState] = useState(getStoredCurrency);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    localStorage.setItem("trippulse_lang", l);
  }, []);

  const setCurrency = useCallback((c: string) => {
    setCurrencyState(c);
    localStorage.setItem("trippulse_currency", c);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(lang, key), [lang]);

  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? "€";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, currency, setCurrency, currencySymbol }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
