import { useEffect } from "react";
import { Mic, Loader2, AlertCircle } from "lucide-react";
import {
  useSpeechRecognition,
  type UseSpeechRecognitionOptions,
} from "@/hooks/useSpeechRecognition";
import type { Language } from "@/lib/languages";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface VoiceInputButtonProps {
  selectedLanguage: Language;
  onTranscript: (text: string, isFinal: boolean) => void;
  onSend: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceInputButton({
  selectedLanguage,
  onTranscript,
  onSend,
  onListeningChange,
  disabled,
  className,
}: VoiceInputButtonProps) {
  const onResult = (transcript: string, isFinal: boolean) => {
    onTranscript(transcript, isFinal);
    if (isFinal && transcript.trim()) {
      setTimeout(() => onSend(transcript.trim()), 800);
    }
  };

  const { isSupported, status, errorMessage, start, stop, clearError } =
    useSpeechRecognition({
      langCode: selectedLanguage.code,
      onResult,
      onError: () => {},
    });

  useEffect(() => {
    onListeningChange?.(status === "listening");
  }, [status, onListeningChange]);

  // Reset error state after 2 seconds
  useEffect(() => {
    if (status !== "error") return;
    const t = setTimeout(clearError, 2000);
    return () => clearTimeout(t);
  }, [status, clearError]);

  const isListening = status === "listening";
  const isProcessing = status === "processing";
  const isError = status === "error";

  const handleClick = () => {
    if (isListening) {
      stop();
      return;
    }
    if (!isSupported || disabled) return;
    start();
  };

  const tooltip = !isSupported
    ? "Voice input requires Chrome or Edge. You can type your message."
    : isError && errorMessage
      ? errorMessage
      : isListening
        ? "Listening... speak now"
        : `Click to speak in ${selectedLanguage.name}`;

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !isSupported}
      aria-label={tooltip}
      className={className}
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isError
          ? "rgba(245, 158, 11, 0.2)"
          : isListening
            ? "transparent"
            : "var(--field)",
        border: `1px solid ${isListening ? "rgba(255, 68, 68, 0.6)" : "rgba(0, 255, 127, 0.3)"}`,
        color: isError ? "var(--harvest, #f5a623)" : isListening ? "#ff4444" : "var(--crop-green)",
        boxShadow: isListening
          ? "0 0 0 0 rgba(255, 68, 68, 0.4)"
          : undefined,
        animation: isListening ? "voice-pulse 1s ease-in-out infinite" : undefined,
      }}
    >
      {isError && <AlertCircle className="h-5 w-5" />}
      {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
      {!isError && !isProcessing && <Mic className="h-5 w-5" />}
    </button>
  );

  return (
    <>
      <style>{`
        @keyframes voice-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(255, 68, 68, 0); }
        }
      `}</style>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
