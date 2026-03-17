import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { BASE_TRANSLATIONS, type TranslationKey } from "@/lib/translationStrings";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/languages";

export interface TranslationContextType {
  t: (key: TranslationKey) => string;
  currentLanguage: Language;
  setLanguage: (lang: Language) => Promise<void>;
  reapplyTranslation: () => void;
  isTranslating: boolean;
  translationProgress: number;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

const LANG_STORAGE_KEY = "agroscope_language";

/** Map our code to Google Translate select value (they use zh-CN not zh, etc.) */
const TO_GOOGLE_CODE: Record<string, string> = {
  zh: "zh-CN",
  en: "en",
};
function getGoogleLangCode(code: string): string {
  return TO_GOOGLE_CODE[code] ?? code;
}

function getStoredLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as { code: string };
      const found = SUPPORTED_LANGUAGES.find((l) => l.code === parsed.code);
      if (found) return found;
    }
  } catch {
    /* ignore */
  }
  const browserLang = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";
  const found = SUPPORTED_LANGUAGES.find((l) => l.code === browserLang);
  return found ?? SUPPORTED_LANGUAGES.find((l) => l.code === "en")!;
}

/** Reset Google Translate to show original (English). Set cookie then reload. */
function resetGoogleTranslateToEnglish(): void {
  if (typeof document === "undefined") return;
  document.cookie = "googtrans=/en/en; path=/; max-age=86400";
}

/** Trigger Google Translate widget by setting the hidden select and firing change. */
function triggerGoogleTranslate(langCode: string): boolean {
  if (typeof document === "undefined") return false;

  if (langCode === "en") {
    resetGoogleTranslateToEnglish();
    window.location.reload();
    return true;
  }

  const select = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
  if (!select) return false;

  const googleCode = getGoogleLangCode(langCode);
  const option = Array.from(select.options).find(
    (o) => o.value === googleCode || o.value === langCode || o.value.endsWith(langCode) || o.value.startsWith(langCode + "|")
  );
  if (option) {
    select.value = option.value;
  } else {
    select.value = googleCode;
  }
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/** Wait for Google Translate widget to be ready, then run fn. */
function whenGoogleTranslateReady(fn: () => void, maxWait = 8000) {
  if (typeof document === "undefined") return;
  if (document.querySelector(".goog-te-combo")) {
    fn();
    return;
  }
  const start = Date.now();
  const id = setInterval(() => {
    if (document.querySelector(".goog-te-combo")) {
      clearInterval(id);
      fn();
    } else if (Date.now() - start > maxWait) clearInterval(id);
  }, 200);
}

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<Language>(getStoredLanguage);
  const readyRef = useRef(false);

  const t = useCallback((key: TranslationKey): string => {
    return BASE_TRANSLATIONS[key] ?? key;
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    localStorage.setItem(LANG_STORAGE_KEY, JSON.stringify({ code: lang.code, name: lang.name, native: lang.native }));
    setCurrentLanguageState(lang);

    whenGoogleTranslateReady(() => triggerGoogleTranslate(lang.code));
  }, [currentLanguage.code]);

  const reapplyTranslation = useCallback(() => {
    whenGoogleTranslateReady(() => {
      setTimeout(() => triggerGoogleTranslate(currentLanguage.code), 150);
    });
  }, [currentLanguage.code]);

  useEffect(() => {
    const lang = getStoredLanguage();
    if (lang.code === "en") return;
    whenGoogleTranslateReady(() => {
      if (!readyRef.current) {
        readyRef.current = true;
        triggerGoogleTranslate(lang.code);
      }
    });
  }, []);

  useEffect(() => {
    const dir = ["ar", "he", "ur"].includes(currentLanguage.code) ? "rtl" : "ltr";
    const lang = currentLanguage.code;
    if (typeof document !== "undefined") {
      document.documentElement.dir = dir;
      document.documentElement.lang = lang;
    }
  }, [currentLanguage]);

  return (
    <TranslationContext.Provider
      value={{
        t,
        currentLanguage,
        setLanguage,
        reapplyTranslation,
        isTranslating: false,
        translationProgress: 0,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextType {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error("useTranslation must be used within TranslationProvider");
  return ctx;
}
