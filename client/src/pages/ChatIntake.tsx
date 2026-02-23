import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTrip } from "@/contexts/TripContext";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Send,
  Loader2,
  ArrowLeft,
  Plane,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Palmtree,
  Building2,
  Trees,
  Shuffle,
  Globe,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

/* ─── Quick-reply chip data ─── */
const STYLE_CHIPS = [
  {
    key: "sea",
    icon: Palmtree,
    color: "text-cyan-600 bg-cyan-50 border-cyan-200 hover:bg-cyan-100",
  },
  {
    key: "city",
    icon: Building2,
    color: "text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100",
  },
  {
    key: "nature",
    icon: Trees,
    color:
      "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
  },
  {
    key: "mixed",
    icon: Shuffle,
    color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100",
  },
] as const;

export default function ChatIntake() {
  const { t, lang } = useLanguage();
  const { updateTripParams, setTripUniqueId, setOffers } = useTrip();
  const [, navigate] = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const createTrip = trpc.trips.create.useMutation();
  const searchOffers = trpc.offers.search.useMutation();

  /* ─── Stable transport (memo to avoid re-creating on every render) ─── */
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/trip-chat",
        prepareSendMessagesRequest({ messages }) {
          return { body: { messages, language: lang } };
        },
      }),
    [lang]
  );

  /* ─── useChat hook ─── */
  const { messages, sendMessage, status, setMessages } = useChat({
    id: "trip-intake",
    transport,
    onFinish: async ({ messages: finalMessages }) => {
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.parts) {
        for (const part of lastMsg.parts) {
          if (
            (part as any).type === "tool-invocation" &&
            (part as any).toolInvocation?.toolName === "extractTripParams" &&
            (part as any).toolInvocation?.state === "result"
          ) {
            const params = (part as any).toolInvocation.result?.params;
            if (params) {
              await handleTripParamsExtracted(params);
              return;
            }
          }
          // Also check the old format
          if (
            part.type?.startsWith?.("tool-") &&
            part.type === "tool-extractTripParams" &&
            (part as any).state === "output-available"
          ) {
            const params = (part as any).output?.params;
            if (params) {
              await handleTripParamsExtracted(params);
              return;
            }
          }
        }
      }
    },
    onError: error => {
      toast.error(t("error"), { description: error.message });
    },
  });

  /* ─── Trip extraction callback ─── */
  const handleTripParamsExtracted = useCallback(
    async (params: any) => {
      setIsSearching(true);
      try {
        updateTripParams({
          origin: params.origin,
          originCity: params.originCity,
          destination: params.destination,
          destinationCity: params.destinationCity,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          travelers: params.travelers,
          tripStyle: params.tripStyle,
          totalBudget: params.totalBudget,
          budgetType: params.budgetType ?? "total_trip",
          currency: params.currency ?? "EUR",
          maxStops: params.maxStops,
          timePreference: params.timePreference,
          baggage: params.baggage,
        });

        const trip = await createTrip.mutateAsync({
          origin: params.origin,
          originCity: params.originCity,
          destination: params.destination,
          destinationCity: params.destinationCity,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          travelers: params.travelers,
          tripStyle: params.tripStyle,
          totalBudget: params.totalBudget?.toString(),
          budgetType: params.budgetType ?? "total_trip",
          currency: params.currency ?? "EUR",
        });

        setTripUniqueId(trip.uniqueId);

        const result = await searchOffers.mutateAsync({
          tripUniqueId: trip.uniqueId,
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          travelers: params.travelers,
          currency: params.currency ?? "EUR",
          maxStops: params.maxStops,
          timePreference: params.timePreference,
          baggage: params.baggage,
          budgetPerPerson: params.totalBudget
            ? params.totalBudget / params.travelers
            : undefined,
          tripStyle: params.tripStyle,
        });

        setOffers(result.offers);
        navigate("/results/" + trip.uniqueId);
      } catch (error: any) {
        toast.error(t("error"), { description: error.message });
      } finally {
        setIsSearching(false);
      }
    },
    [
      updateTripParams,
      createTrip,
      searchOffers,
      setTripUniqueId,
      setOffers,
      navigate,
      t,
    ]
  );

  /* ─── Auto-scroll to bottom ─── */
  useEffect(() => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, [messages, status, isSearching]);

  /* ─── Welcome message ─── */
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          parts: [{ type: "text", text: t("chatWelcome") }],
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Send helpers ─── */
  const doSend = useCallback(
    (text: string) => {
      if (!text.trim() || status !== "ready" || isSearching) return;
      sendMessage({ parts: [{ type: "text", text: text.trim() }] });
    },
    [sendMessage, status, isSearching]
  );

  const handleSubmit = () => {
    if (inputValue.trim()) {
      doSend(inputValue);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  /* ─── Quick-reply handler: sends the text directly as a message ─── */
  const handleQuickReply = useCallback(
    (text: string) => {
      doSend(text);
    },
    [doSend]
  );

  const isWaiting = status === "submitted";
  const isStreaming = status === "streaming";
  const isBusy = isWaiting || isStreaming || isSearching;

  /* ─── Determine if we should show initial style chips ─── */
  const userMessageCount = messages.filter(m => m.role === "user").length;
  const showStyleChips = userMessageCount === 0 && !isBusy;

  /* ─── Style chip labels ─── */
  const styleLabels: Record<string, string> = {
    sea: t("styleSea"),
    city: t("styleCity"),
    nature: t("styleNature"),
    mixed: t("styleMixed"),
  };

  /* ─── Render a single message ─── */
  const renderMessageContent = (msg: any) => {
    return msg.parts?.map((part: any, i: number) => {
      // Text parts
      if (part.type === "text") {
        if (
          !part.text &&
          isStreaming &&
          msg.id === messages[messages.length - 1]?.id
        ) {
          return (
            <Loader2
              key={i}
              className="w-4 h-4 animate-spin text-muted-foreground"
            />
          );
        }
        return msg.role === "assistant" ? (
          <Markdown
            key={i}
            mode={
              isStreaming && msg.id === messages[messages.length - 1]?.id
                ? "streaming"
                : "static"
            }
          >
            {part.text}
          </Markdown>
        ) : (
          <span key={i}>{part.text}</span>
        );
      }

      // Tool invocation parts (AI SDK v6 format)
      if ((part as any).type === "tool-invocation") {
        const inv = (part as any).toolInvocation;
        if (!inv) return null;

        // extractTripParams tool
        if (inv.toolName === "extractTripParams") {
          if (inv.state === "call" || inv.state === "partial-call") {
            return (
              <div key={i} className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {t("chatSearching")}
                </span>
              </div>
            );
          }
          if (inv.state === "result") {
            const params = inv.result?.params;
            if (params) {
              return (
                <div
                  key={i}
                  className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Plane className="w-3.5 h-3.5" />
                    {params.originCity} → {params.destinationCity}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {params.departureDate} — {params.returnDate}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {params.travelers} {t("travelers")}
                  </div>
                  {params.totalBudget && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wallet className="w-3 h-3" />
                      {params.totalBudget} {params.currency ?? "EUR"}
                    </div>
                  )}
                </div>
              );
            }
          }
        }

        // suggestDestinations tool
        if (inv.toolName === "suggestDestinations") {
          if (inv.state === "result") {
            const destinations = inv.result;
            if (Array.isArray(destinations)) {
              return (
                <div key={i} className="mt-3 space-y-2">
                  {destinations.map((d: any, j: number) => (
                    <button
                      key={j}
                      disabled={isBusy}
                      onClick={() =>
                        handleQuickReply(
                          `I'd like to go to ${d.city} (${d.iata})`
                        )
                      }
                      className="w-full text-left p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{d.city}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 ml-auto shrink-0"
                        >
                          {d.iata}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {d.reason}
                      </p>
                    </button>
                  ))}
                </div>
              );
            }
          }
          return (
            <div key={i} className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs text-muted-foreground">
                {t("chatThinking")}
              </span>
            </div>
          );
        }

        return null;
      }

      // Legacy tool format (tool-extractTripParams / tool-suggestDestinations)
      if (part.type?.startsWith?.("tool-")) {
        if (part.type === "tool-extractTripParams") {
          const state = (part as any).state;
          if (state === "input-streaming" || state === "input-available") {
            return (
              <div key={i} className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {t("chatSearching")}
                </span>
              </div>
            );
          }
          if (state === "output-available") {
            const params = (part as any).output?.params;
            if (params) {
              return (
                <div
                  key={i}
                  className="mt-2 p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Plane className="w-3.5 h-3.5" />
                    {params.originCity} → {params.destinationCity}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {params.departureDate} — {params.returnDate}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {params.travelers} {t("travelers")}
                  </div>
                  {params.totalBudget && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Wallet className="w-3 h-3" />
                      {params.totalBudget} {params.currency ?? "EUR"}
                    </div>
                  )}
                </div>
              );
            }
          }
        }
        if (part.type === "tool-suggestDestinations") {
          const state = (part as any).state;
          if (state === "output-available") {
            const destinations = (part as any).output;
            if (Array.isArray(destinations)) {
              return (
                <div key={i} className="mt-3 space-y-2">
                  {destinations.map((d: any, j: number) => (
                    <button
                      key={j}
                      disabled={isBusy}
                      onClick={() =>
                        handleQuickReply(
                          `I'd like to go to ${d.city} (${d.iata})`
                        )
                      }
                      className="w-full text-left p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{d.city}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 ml-auto shrink-0"
                        >
                          {d.iata}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        {d.reason}
                      </p>
                    </button>
                  ))}
                </div>
              );
            }
          }
          return (
            <div key={i} className="flex items-center gap-2 py-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs text-muted-foreground">
                {t("chatThinking")}
              </span>
            </div>
          );
        }
        return null;
      }

      return null;
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plane className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{t("appName")}</h1>
            <p className="text-[10px] text-muted-foreground">{t("tagline")}</p>
          </div>
        </div>
      </header>

      {/* ─── Messages area ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-40"
      >
        <AnimatePresence mode="popLayout">
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-card-foreground rounded-bl-md shadow-sm"
                )}
              >
                {renderMessageContent(msg)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* ─── Typing indicator ─── */}
        {isWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-primary/40 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Flight search overlay ─── */}
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center py-8"
          >
            <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border shadow-lg">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Plane className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {t("chatSearching")}
              </p>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {t("loading")}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── Initial style quick-reply chips ─── */}
        {showStyleChips && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="pt-2 space-y-3"
          >
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {t("whatStyle")}
            </p>
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {STYLE_CHIPS.map(({ key, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => handleQuickReply(styleLabels[key])}
                  disabled={isBusy}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all active:scale-[0.97]",
                    color
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {styleLabels[key]}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleQuickReply(t("unknownDest"))}
              disabled={isBusy}
              className="mx-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              {t("unknownDest")}
            </button>
          </motion.div>
        )}
      </div>

      {/* ─── Input bar ─── */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 border-t border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chatPlaceholder")}
            disabled={isSearching}
            className="flex-1 h-11 px-4 rounded-xl text-sm border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors disabled:opacity-50"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || status !== "ready" || isSearching}
            className="h-11 w-11 rounded-xl shrink-0"
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
