import { useTranslation } from "@/context/TranslationContext";

const STEPS = [
  "Converting navigation...",
  "Converting form labels...",
  "Converting AI responses...",
  "Converting notifications...",
];

export default function TranslationOverlay() {
  const { isTranslating, translationProgress, currentLanguage } = useTranslation();

  if (!isTranslating) return null;

  const stepIndex = Math.min(
    Math.floor((translationProgress / 100) * STEPS.length),
    STEPS.length - 1
  );

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--void)]/95 backdrop-blur-md"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-6 max-w-sm w-full px-6">
        <span className="text-3xl" aria-hidden>
          🌾
        </span>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] text-center">
          AgroScope
        </h2>
        <p className="text-sm text-[var(--text-muted)] text-center">
          Translating to {currentLanguage.native}...
        </p>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--crop-green)] transition-all duration-300 ease-out"
            style={{ width: `${translationProgress}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text-muted)]">{translationProgress}%</p>
        <ul className="w-full space-y-2 text-sm text-[var(--text-muted)]">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className="flex items-center justify-between gap-2"
            >
              <span>{label}</span>
              {i < stepIndex ? (
                <span className="text-[var(--crop-green)]">✅</span>
              ) : i === stepIndex ? (
                <span className="text-[var(--crop-green)] animate-pulse">⏳</span>
              ) : (
                <span className="text-white/30">—</span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--text-muted)] text-center mt-2">
          Powered by DeepSeek AI
        </p>
        <p className="text-xs text-[var(--crop-green)] text-center">
          Next visit will be instant ⚡
        </p>
      </div>
    </div>
  );
}
