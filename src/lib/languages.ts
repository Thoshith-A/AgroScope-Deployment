/**
 * Supported languages for AgroScope voice + AI negotiation.
 * Indian languages first; then global.
 */

export interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  // Indian Languages FIRST (most important for farmers)
  { code: "hi", name: "Hindi", native: "हिंदी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇮🇳" },
  { code: "or", name: "Odia", native: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "as", name: "Assamese", native: "অসমীয়া", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", native: "اردو", flag: "🇮🇳" },
  { code: "sa", name: "Sanskrit", native: "संस्कृतम्", flag: "🇮🇳" },
  { code: "mai", name: "Maithili", native: "मैथिली", flag: "🇮🇳" },
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  // Global Languages
  { code: "zh", name: "Chinese", native: "中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", native: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "Korean", native: "한국어", flag: "🇰🇷" },
  { code: "ar", name: "Arabic", native: "العربية", flag: "🇸🇦" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", native: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "pt", name: "Portuguese", native: "Português", flag: "🇵🇹" },
  { code: "ru", name: "Russian", native: "Русский", flag: "🇷🇺" },
  { code: "it", name: "Italian", native: "Italiano", flag: "🇮🇹" },
  { code: "tr", name: "Turkish", native: "Türkçe", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "Thai", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "id", name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", name: "Malay", native: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "nl", name: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  { code: "pl", name: "Polish", native: "Polski", flag: "🇵🇱" },
  { code: "sv", name: "Swedish", native: "Svenska", flag: "🇸🇪" },
  { code: "no", name: "Norwegian", native: "Norsk", flag: "🇳🇴" },
  { code: "da", name: "Danish", native: "Dansk", flag: "🇩🇰" },
  { code: "fi", name: "Finnish", native: "Suomi", flag: "🇫🇮" },
  { code: "el", name: "Greek", native: "Ελληνικά", flag: "🇬🇷" },
  { code: "he", name: "Hebrew", native: "עברית", flag: "🇮🇱" },
  { code: "ro", name: "Romanian", native: "Română", flag: "🇷🇴" },
  { code: "hu", name: "Hungarian", native: "Magyar", flag: "🇭🇺" },
  { code: "cs", name: "Czech", native: "Čeština", flag: "🇨🇿" },
  { code: "sk", name: "Slovak", native: "Slovenčina", flag: "🇸🇰" },
  { code: "uk", name: "Ukrainian", native: "Українська", flag: "🇺🇦" },
  { code: "ca", name: "Catalan", native: "Català", flag: "🏴" },
  { code: "hr", name: "Croatian", native: "Hrvatski", flag: "🇭🇷" },
  { code: "sr", name: "Serbian", native: "Српски", flag: "🇷🇸" },
  { code: "bg", name: "Bulgarian", native: "Български", flag: "🇧🇬" },
  { code: "lt", name: "Lithuanian", native: "Lietuvių", flag: "🇱🇹" },
  { code: "lv", name: "Latvian", native: "Latviešu", flag: "🇱🇻" },
  { code: "sw", name: "Swahili", native: "Kiswahili", flag: "🇰🇪" },
];

/** Browser SpeechRecognition / TTS locale code (e.g. hi-IN, en-US). */
export function getSpeechLangCode(code: string): string {
  const MAP: Record<string, string> = {
    hi: "hi-IN",
    ta: "ta-IN",
    te: "te-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    mr: "mr-IN",
    gu: "gu-IN",
    pa: "pa-IN",
    bn: "bn-IN",
    or: "or-IN",
    as: "as-IN",
    ur: "ur-IN",
    en: "en-US",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR",
    ar: "ar-SA",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    pt: "pt-BR",
    ru: "ru-RU",
    it: "it-IT",
    tr: "tr-TR",
    vi: "vi-VN",
    th: "th-TH",
    id: "id-ID",
    ms: "ms-MY",
    nl: "nl-NL",
    pl: "pl-PL",
    sv: "sv-SE",
    fi: "fi-FI",
    el: "el-GR",
    he: "he-IL",
    ro: "ro-RO",
    hu: "hu-HU",
    cs: "cs-CZ",
    uk: "uk-UA",
    hr: "hr-HR",
    bg: "bg-BG",
    sw: "sw-KE",
  };
  // Use mapped locale if available; otherwise en-US so speech recognition can start (browsers support limited locales)
  return MAP[code] || "en-US";
}

const INDIAN_CODES = new Set([
  "hi", "ta", "te", "kn", "ml", "mr", "gu", "pa", "bn", "or", "as", "ur", "sa", "mai",
]);

export function isIndianLanguage(code: string): boolean {
  return INDIAN_CODES.has(code);
}

export function getDefaultLanguage(): Language {
  const browser = typeof navigator !== "undefined" ? navigator.language : "";
  const base = browser.split("-")[0].toLowerCase();
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === base || l.code === browser.slice(0, 2));
  return match ?? SUPPORTED_LANGUAGES.find((l) => l.code === "en")!;
}
