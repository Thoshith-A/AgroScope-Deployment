import { useState, useCallback, useEffect, useRef } from "react";
import { getSpeechLangCode } from "@/lib/languages";

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const voicesLoadedRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis.getVoices().length > 0) {
        voicesLoadedRef.current = true;
        setVoicesReady(true);
      }
    };
    loadVoices();
    if (typeof window !== "undefined") {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback((text: string, langCode: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const locale = getSpeechLangCode(langCode); // e.g. "te-IN" for Telugu

    const doSpeak = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const exactMatch = voices.find((v) => v.lang === locale);
      const prefixMatch = voices.find((v) => v.lang.startsWith(langCode) && v.localService)
        ?? voices.find((v) => v.lang.startsWith(langCode));
      const bestVoice = exactMatch ?? prefixMatch ?? voices.find((v) => v.lang.startsWith(langCode));
      if (bestVoice) utterance.voice = bestVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    const voicesNow = window.speechSynthesis.getVoices();
    if (voicesNow.length === 0) {
      let done = false;
      const trySpeak = () => {
        if (done) return;
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
          done = true;
          voicesLoadedRef.current = true;
          doSpeak();
        } else {
          setTimeout(trySpeak, 50);
        }
      };
      window.speechSynthesis.onvoiceschanged = () => { trySpeak(); };
      setTimeout(trySpeak, 80);
    } else {
      doSpeak();
    }
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, voicesReady };
}
