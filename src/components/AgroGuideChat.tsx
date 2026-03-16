import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Loader2, Volume2, Square, RotateCcw, ExternalLink } from "lucide-react";
import LanguageSelector, { getDefaultLanguage } from "@/components/LanguageSelector";
import VoiceInputButton from "@/components/VoiceInputButton";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useAgroGuideContext } from "@/hooks/useAgroGuideContext";
import { getBalanceWallet, getWallet } from "@/lib/api";
import { getAgroGuideResponse, getAgroGuideStatus, getAgroGuideUserContext, type AgroGuideMessage } from "@/services/agroGuideService";
import type { Language } from "@/lib/languages";

/** Known app routes to turn into clickable links in AgroGuide replies (longer first for matching). */
const AGROGUIDE_ROUTES = [
  "/loyalty/tier/A", "/loyalty/tier/B", "/loyalty/tier/C",
  "/wallet/transactions", "/wallet/withdraw", "/startup-input", "/farmer-inventory", "/startup-matches",
  "/agro-news-live", "/weather-forecast", "/live-prices",
  "/home", "/input", "/profile", "/notifications", "/forecast", "/carbon", "/recommendations",
  "/loyalty", "/dashboard", "/results", "/payments", "/verification",
];

const LANG_STORAGE_KEY = "agroscope_agroguide_lang";
const AUTO_SPEAK_KEY = "agroscope_agroguide_autospeak";

/** Regex to find app route paths in text (for linkification). */
const ROUTE_REGEX = new RegExp(
  "(" + AGROGUIDE_ROUTES.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")",
  "g"
);

/** Renders message content with route paths as clickable links and a small redirect icon. */
function renderMessageWithLinks(content: string) {
  const parts = content.split(ROUTE_REGEX);
  return parts.map((part, i) => {
    if (AGROGUIDE_ROUTES.includes(part)) {
      return (
        <Link
          key={`${i}-${part}`}
          to={part}
          className="inline-flex items-center gap-0.5 rounded px-0.5 font-medium text-emerald-700 hover:underline hover:bg-emerald-50"
          onClick={() => {}}
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{part}</span>
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const WELCOME_MESSAGE: AgroGuideMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Namaste! 🌾 I'm AgroGuide — your personal assistant for AgroScope.\n\nI know every page, every feature, every formula, and the full tech stack. I can guide you step-by-step and give you clickable links to any part of the platform — whether you're a farmer, startup, or admin.\n\nWhat would you like to know or do? 🌱",
  timestamp: Date.now(),
};

export interface AgroGuideChatProps {
  isOpen: boolean;
  onClose: () => void;
  proactiveMessage?: string;
  onProactiveShown?: () => void;
}

export default function AgroGuideChat({
  isOpen,
  onClose,
  proactiveMessage,
  onProactiveShown,
}: AgroGuideChatProps) {
  const { context, label, chips } = useAgroGuideContext();
  const [messages, setMessages] = useState<AgroGuideMessage[]>([WELCOME_MESSAGE]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguageState] = useState<Language>(() => {
    if (typeof sessionStorage === "undefined") return getDefaultLanguage();
    try {
      const saved = sessionStorage.getItem(LANG_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Language;
        if (parsed?.code) return parsed;
      }
    } catch {
      /* ignore */
    }
    return getDefaultLanguage();
  });

  const setSelectedLanguage = useCallback((lang: Language) => {
    setSelectedLanguageState(lang);
    try {
      sessionStorage.setItem(LANG_STORAGE_KEY, JSON.stringify(lang));
    } catch {
      /* ignore */
    }
  }, []);

  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return sessionStorage.getItem(AUTO_SPEAK_KEY) !== "false";
    } catch {
      return true;
    }
  });

  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const { speak, stop, isSpeaking } = useTextToSpeech();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    getAgroGuideStatus().then(({ configured, message }) => {
      if (cancelled) return;
      setConnectionWarning(configured ? null : message);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (!proactiveMessage || messages.length > 1) return;
    const t = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `proactive-${Date.now()}`,
          role: "assistant",
          content: proactiveMessage,
          timestamp: Date.now(),
        },
      ]);
      onProactiveShown?.();
    }, 500);
    return () => clearTimeout(t);
  }, [proactiveMessage, messages.length, onProactiveShown]);

  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail?.message as string | undefined;
      if (msg && msg.trim()) sendMessage(msg);
    };
    window.addEventListener("openAgroGuide", handler);
    return () => window.removeEventListener("openAgroGuide", handler);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      const userMsg: AgroGuideMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };
      const assistantId = `a-${Date.now() + 1}`;
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", timestamp: Date.now() },
      ]);
      setInputText("");
      setShowChips(false);
      setIsLoading(true);
      try {
        const history = [...messages, userMsg];
        // Fetch real-time data from same APIs as homepage (Wallet dropdown + nav bar) so AgroGuide shows exact same numbers
        const [balanceData, loyaltyData] = await Promise.all([
          getBalanceWallet().catch(() => null),
          getWallet().catch(() => null),
        ]);
        const injected = {
          agroCredits: loyaltyData?.wallet?.agroCredits,
          agroCoins: loyaltyData?.wallet?.agroCoins,
          pendingCredits: loyaltyData?.wallet?.pendingCredits,
          balance: balanceData?.wallet?.balance,
          totalEarned: balanceData?.wallet?.totalEarned,
          totalWithdrawn: balanceData?.wallet?.totalWithdrawn,
        };
        const userContext = await getAgroGuideUserContext(injected);
        const reply = await getAgroGuideResponse(
          trimmed,
          history,
          selectedLanguage.code,
          selectedLanguage.name,
          selectedLanguage.native,
          context,
          userContext
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: reply } : m))
        );
        if (autoSpeak) speak(reply, selectedLanguage.code);
      } catch (err) {
        const message = err instanceof Error ? err.message : "I'm having trouble connecting. Please try again. 🙏";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: message } : m
          )
        );
      } finally {
        setIsLoading(false);
        if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    },
    [isLoading, messages, context, selectedLanguage, autoSpeak, speak]
  );

  const handleNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setShowChips(true);
    setInputText("");
    setIsLoading(false);
    window.speechSynthesis?.cancel();
  };

  const handleSpeakMessage = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      stop();
      setSpeakingMessageId(null);
      return;
    }
    stop();
    setSpeakingMessageId(messageId);
    speak(content, selectedLanguage.code);
  };

  useEffect(() => {
    if (!isSpeaking) setSpeakingMessageId(null);
  }, [isSpeaking]);

  const handleAutoSpeakToggle = () => {
    const next = !autoSpeak;
    setAutoSpeak(next);
    try {
      sessionStorage.setItem(AUTO_SPEAK_KEY, next ? "true" : "false");
    } catch {
      /* ignore */
    }
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    setInputText((prev) => (text ? text : prev));
  }, []);

  const handleVoiceSend = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed && !isLoading) {
      setInputText("");
      sendMessage(trimmed);
    }
  }, [isLoading, sendMessage]);

  return (
    <motion.div
      className="fixed bottom-0 left-0 z-[9998] flex h-[85vh] w-full max-w-[100vw] flex-col overflow-hidden rounded-t-2xl border border-gray-200 shadow-2xl sm:bottom-[90px] sm:left-6 sm:h-[560px] sm:w-[380px] sm:max-w-[380px] sm:rounded-2xl"
      style={{ background: "#ffffff" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-3"
        style={{
          background: "linear-gradient(135deg, #0A1A0F, #166534)",
          borderColor: "rgba(0,200,83,0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🌾</span>
          <span className="font-bold text-white" style={{ fontSize: 15 }}>
            AgroGuide
          </span>
          <span className="h-2 w-2 rounded-full bg-green-400" title="Online" />
          <span className="text-xs text-white/70">Online</span>
        </div>
        <div className="flex items-center gap-1">
          <LanguageSelector selected={selectedLanguage} onChange={setSelectedLanguage} />
          {isSpeaking && (
            <button
              type="button"
              onClick={() => {
                stop();
                setSpeakingMessageId(null);
              }}
              className="rounded-lg p-1.5 text-red-400 hover:bg-red-400/10 border border-red-400/30"
              aria-label="Stop audio"
              title="Stop audio"
            >
              <Square className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleAutoSpeakToggle}
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
              autoSpeak
                ? "border border-green-400/50 bg-green-400/10 text-green-400"
                : "border border-white/20 text-white/70 hover:bg-white/10"
            }`}
          >
            🔊 {autoSpeak ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={handleNewChat}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="New chat"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      {/* Page banner */}
      <div
        className="shrink-0 border-b px-4 py-2 text-xs"
        style={{
          background: "rgba(34, 197, 94, 0.08)",
          borderColor: "rgba(34, 197, 94, 0.2)",
          color: "#166534",
        }}
      >
        📍 You are on: {label}
      </div>

      {/* Connection warning when backend not configured or unreachable */}
      {connectionWarning && (
        <div
          className="shrink-0 border-b px-4 py-2 text-xs"
          style={{
            background: "rgba(239,68,68,0.1)",
            borderColor: "rgba(239,68,68,0.25)",
            color: "#b91c1c",
          }}
        >
          ⚠️ {connectionWarning}
        </div>
      )}

      {/* Chips */}
      {showChips && chips.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-1.5 border-b border-gray-200 px-4 py-3">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => sendMessage(chip)}
              disabled={isLoading}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                background: "rgba(34, 197, 94, 0.1)",
                color: "#166534",
                border: "1px solid rgba(34, 197, 94, 0.3)",
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {m.role === "assistant" && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.35)",
                }}
              >
                🌾
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-emerald-50 border border-emerald-200 text-gray-900"
                  : "bg-gray-100 border border-gray-200 text-gray-900"
              }`}
            >
              <div className="flex items-end justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {m.role === "assistant" && m.content
                    ? renderMessageWithLinks(m.content)
                    : (m.content || null)}
                </div>
                {m.role === "assistant" && m.content && (
                  <button
                    type="button"
                    onClick={() => handleSpeakMessage(m.id, m.content)}
                    className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 hover:text-emerald-600 transition-colors"
                    aria-label={speakingMessageId === m.id ? "Stop" : "Speak"}
                  >
                    {speakingMessageId === m.id ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm">AgroGuide thinking...</span>
            <span className="flex gap-1">
              <span className="arena-typing-dot h-2 w-2 rounded-full bg-emerald-500" />
              <span className="arena-typing-dot h-2 w-2 rounded-full bg-emerald-500" />
              <span className="arena-typing-dot h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 border-t border-gray-200 bg-white p-4">
        {isSpeaking && (
          <button
            type="button"
            onClick={() => {
              stop();
              setSpeakingMessageId(null);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            aria-label="Stop talking"
            title="Stop talking"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop talking
          </button>
        )}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (inputText.trim() && !isLoading) sendMessage(inputText.trim());
            }
          }}
          placeholder={`Ask in ${selectedLanguage.native}...`}
          className="flex-1 min-w-0 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400"
          disabled={isLoading}
        />
        <VoiceInputButton
          selectedLanguage={selectedLanguage}
          onTranscript={(text) => handleVoiceTranscript(text)}
          onSend={handleVoiceSend}
          onListeningChange={() => {}}
          disabled={isLoading}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => inputText.trim() && !isLoading && sendMessage(inputText.trim())}
          disabled={isLoading || !inputText.trim()}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>
    </motion.div>
  );
}
