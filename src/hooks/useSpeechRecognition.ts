import { useState, useCallback, useRef, useEffect } from "react";
import { getSpeechLangCode } from "@/lib/languages";

type SpeechRecognitionStatus = "idle" | "listening" | "processing" | "error";

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export interface UseSpeechRecognitionOptions {
  langCode: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions) {
  const { langCode, onResult, onError } = options;
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setStatus((s) => (s === "listening" ? "idle" : s));
    setInterimTranscript("");
  }, []);

  const start = useCallback(() => {
    if (!isSupported) {
      setErrorMessage("Voice input not supported in this browser. Use Chrome or Edge.");
      setStatus("error");
      onError?.("not-supported");
      return;
    }

    setErrorMessage(null);
    setInterimTranscript("");
    setStatus("listening");

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getSpeechLangCode(langCode);
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      const isFinal = event.results[event.results.length - 1].isFinal;
      setInterimTranscript(transcript);
      onResult?.(transcript, isFinal);
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        setStatus("processing");
      } else {
        setStatus("idle");
      }
      setInterimTranscript((t) => t);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      recognitionRef.current = null;
      setStatus("error");
      const msg =
        event.error === "not-allowed"
          ? "Microphone access denied"
          : event.error === "language-not-supported"
            ? "Language not supported by browser. Please type instead."
            : event.error === "no-speech"
              ? "No speech detected. Try again."
              : "Voice input failed. Try again or type your message.";
      setErrorMessage(msg);
      onError?.(event.error);
    };

    try {
      recognition.start();
    } catch (e) {
      setStatus("error");
      const secureHint =
        typeof window !== "undefined" && !window.isSecureContext
          ? " Microphone works over HTTPS. Type your message instead."
          : " You can type your message instead.";
      setErrorMessage("Could not start microphone." + secureHint);
      onError?.("start");
    }
  }, [isSupported, langCode, onResult, onError]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  return {
    isSupported,
    status,
    interimTranscript,
    errorMessage,
    start,
    stop,
    clearError,
  };
}
