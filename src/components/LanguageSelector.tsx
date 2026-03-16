import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_LANGUAGES,
  getDefaultLanguage,
  isIndianLanguage,
  type Language,
} from "@/lib/languages";

export interface LanguageSelectorProps {
  selected: Language;
  onChange: (lang: Language) => void;
  className?: string;
  /** When set, show this label on the button (e.g. "Change Language") instead of only the language name */
  buttonLabel?: string;
  /** Use more visible styling for navbar/light backgrounds */
  variant?: "default" | "navbar";
}

const INDIAN = SUPPORTED_LANGUAGES.filter((l) => isIndianLanguage(l.code));
const GLOBAL = SUPPORTED_LANGUAGES.filter((l) => !isIndianLanguage(l.code));

export default function LanguageSelector({
  selected,
  onChange,
  className,
  buttonLabel,
  variant = "default",
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const q = search.trim().toLowerCase();
  const filter = (list: Language[]) =>
    list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  const indianFiltered = filter(INDIAN);
  const globalFiltered = filter(GLOBAL);

  const handleSelect = (lang: Language) => {
    onChange(lang);
    setOpen(false);
  };

  const isNavbar = variant === "navbar";
  const displayText = buttonLabel ?? `${selected.native} (${selected.name})`;
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 rounded-md text-sm font-medium transition-colors shrink-0",
          isNavbar
            ? "h-11 px-4 py-2 border-2 border-primary bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground dark:border-primary"
            : "rounded-lg px-3 py-2 border border-white/20 bg-white/5 text-[var(--text-primary)] hover:bg-white/10"
        )}
        aria-label="Change language"
      >
        <Globe className={cn("h-4 w-4", isNavbar ? "text-primary" : "text-[var(--crop-green)]")} />
        <span className="max-w-[140px] truncate">{displayText}</span>
        <span className={cn("text-xs", isNavbar ? "text-primary" : "text-white/60")}>▼</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden dark:border-neutral-700 dark:bg-black/95 dark:shadow-2xl"
          style={{ maxHeight: 280 }}
        >
          <div className="p-2 border-b border-gray-100 dark:border-neutral-700">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search language..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--crop-green)]/50 dark:border-neutral-600 dark:bg-neutral-900 dark:text-gray-100 dark:placeholder:text-gray-400"
            />
          </div>
          <div className="overflow-y-auto py-1" style={{ maxHeight: 240 }}>
            {indianFiltered.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                  🇮🇳 Indian Languages
                </div>
                {indianFiltered.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 transition-colors dark:text-gray-200 dark:hover:bg-neutral-800",
                      selected.code === lang.code && "bg-green-50 dark:bg-neutral-800"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span className="flex-1 truncate">
                      <span className="text-gray-900 dark:text-gray-100">{lang.native}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">{lang.name}</span>
                    </span>
                    {selected.code === lang.code && (
                      <span className="text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
            {globalFiltered.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1 dark:text-gray-400">
                  🌍 Global Languages
                </div>
                {globalFiltered.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 transition-colors dark:text-gray-200 dark:hover:bg-neutral-800",
                      selected.code === lang.code && "bg-green-50 dark:bg-neutral-800"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span className="flex-1 truncate">
                      <span className="text-gray-900 dark:text-gray-100">{lang.native}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-1">{lang.name}</span>
                    </span>
                    {selected.code === lang.code && (
                      <span className="text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}
            {indianFiltered.length === 0 && globalFiltered.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                No language found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { getDefaultLanguage };
