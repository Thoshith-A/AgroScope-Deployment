import type { FC } from "react";

// Safe fallback scene: keeps hero stable if WebGL/postprocessing
// libraries misbehave in the runtime environment.

export const HeroScene: FC = () => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        background:
          "radial-gradient(circle at top, #022c22 0, #020617 55%, #020617 100%)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background:
            "conic-gradient(from 220deg, rgba(34,197,94,0.25), transparent, rgba(212,168,67,0.18), transparent, rgba(34,197,94,0.22))",
          opacity: 0.9,
          mixBlendMode: "screen",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 0%, rgba(125,211,252,0.28) 0, transparent 45%), radial-gradient(circle at 80% 10%, rgba(74,198,157,0.35) 0, transparent 55%)",
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.9))",
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
};

export default HeroScene;


