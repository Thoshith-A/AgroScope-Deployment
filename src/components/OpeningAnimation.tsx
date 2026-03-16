import React, { useEffect, useRef, useState } from "react";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

interface Props {
  onComplete: () => void;
}

type Phase = "black" | "earth" | "text" | "fadeout" | "done";

/**
 * CSS-only opening animation (no Three.js/R3F) so the app always loads.
 * Black screen → text fade-in → fade to home. Skip anytime.
 */
export default function OpeningAnimation({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("black");
  const [progress, setProgress] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [sceneOpacity, setSceneOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [letterSpacing, setLetterSpacing] = useState("0.5em");
  const startTime = useRef(Date.now());
  const rafRef = useRef<number>(0);
  const completedRef = useRef(false);

  const triggerComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase("fadeout");
    setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 800);
  };

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 1500);

    const animate = () => {
      const elapsed = (Date.now() - startTime.current) / 1000;

      if (elapsed < 0.5) {
        setSceneOpacity(0);
        setPhase("black");
      } else if (elapsed < 3.5) {
        setPhase("earth");
        const t = (elapsed - 0.5) / 3.0;
        setSceneOpacity(Math.min(1, t * 2));
        setProgress(clamp(easeInOutCubic(t), 0, 1));
      } else if (elapsed < 4.5) {
        setPhase("text");
        setProgress(1);
        const t = (elapsed - 3.5) / 1.0;
        setTextOpacity(Math.min(1, t * 1.5));
        setLetterSpacing(`${Math.max(0.05, 0.5 - t * 0.45)}em`);
      } else if (elapsed < 5.5) {
        const t = (elapsed - 4.5) / 1.0;
        setSceneOpacity(Math.max(0, 1 - t));
        setTextOpacity(Math.max(0, 1 - t));
      } else {
        triggerComplete();
        return;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      clearTimeout(skipTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#000000",
        opacity: phase === "fadeout" ? 0 : 1,
        transition: phase === "fadeout" ? "opacity 0.8s ease-in-out" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Film grain */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Simple “globe” placeholder (CSS circle) instead of 3D */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: sceneOpacity,
          transition: "opacity 0.5s ease",
        }}
      >
        <div
          style={{
            width: 120 + progress * 180,
            height: 120 + progress * 180,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #2d5a87, #0f2d4a 60%, #050a0f)",
            boxShadow: "0 0 80px rgba(79, 195, 247, 0.25), inset -20px -20px 40px rgba(0,0,0,0.5)",
            transition: "width 0.3s ease, height 0.3s ease",
          }}
        />
      </div>

      {/* Text overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "28%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          zIndex: 10,
          opacity: textOpacity,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing,
            transition: "letter-spacing 0.8s ease-out",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textTransform: "uppercase",
            textShadow: "0 0 40px rgba(100,200,100,0.3)",
          }}
        >
          AgroScope
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "clamp(0.7rem, 1.5vw, 1rem)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.3em",
            fontFamily: "system-ui, -apple-system, sans-serif",
            textTransform: "uppercase",
            opacity: textOpacity > 0.3 ? 1 : 0,
            transition: "opacity 0.5s ease 0.3s",
          }}
        >
          Turning Waste Into Worth
        </p>
        <div
          style={{
            width: `${textOpacity * 80}px`,
            height: "1px",
            background: "linear-gradient(90deg, transparent, #4ade80, transparent)",
            transition: "width 0.8s ease",
            marginTop: "4px",
          }}
        />
      </div>

      {/* Skip */}
      {showSkip && (
        <button
          type="button"
          onClick={triggerComplete}
          style={{
            position: "fixed",
            top: "24px",
            right: "28px",
            zIndex: 10000,
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.4)",
            fontSize: "0.75rem",
            letterSpacing: "0.15em",
            cursor: "pointer",
            padding: "8px 12px",
            textTransform: "uppercase",
            transition: "color 0.2s ease",
            fontFamily: "system-ui, sans-serif",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
          }}
        >
          Skip →
        </button>
      )}
    </div>
  );
}
