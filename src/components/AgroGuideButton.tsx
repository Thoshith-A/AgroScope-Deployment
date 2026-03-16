import { useState, useEffect } from "react";
import { Phone, X } from "lucide-react";
import AgroGuideChat from "./AgroGuideChat";

const PULSE_SEEN_KEY = "agroscope_help_pulse_seen";

export default function AgroGuideButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [proactiveMessage, setProactiveMessage] = useState<string | undefined>();

  useEffect(() => {
    const openPanel = () => setIsOpen(true);
    window.addEventListener("openAgroGuidePanel", openPanel);
    return () => window.removeEventListener("openAgroGuidePanel", openPanel);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setProactiveMessage(undefined);
  };

  useEffect(() => {
    if (isOpen) {
      try {
        sessionStorage.setItem(PULSE_SEEN_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }, [isOpen]);

  const showPulse = (() => {
    try {
      return !sessionStorage.getItem(PULSE_SEEN_KEY);
    } catch {
      return false;
    }
  })();

  return (
    <>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, #166534, #15803d)",
            color: "#fff",
            border: "1px solid rgba(0,200,83,0.3)",
          }}
          aria-label="Open Message"
        >
          {showPulse && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-green-400 animate-ping" />}
          {hasUnread && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              1
            </span>
          )}
          <Phone className="h-5 w-5" />
          <span>Message</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClose}
          className="fixed bottom-6 left-6 z-[9999] flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[var(--void)] text-[var(--text-muted)] shadow-lg transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
          aria-label="Close Message"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {isOpen && (
        <AgroGuideChat
          isOpen={isOpen}
          onClose={handleClose}
          proactiveMessage={proactiveMessage}
          onProactiveShown={() => setProactiveMessage(undefined)}
        />
      )}
    </>
  );
}
