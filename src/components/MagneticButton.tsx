import type React from "react";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { MapPin } from "lucide-react";

export function MagneticButton({ onClick }: { onClick: () => void }) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 15 });
  const springY = useSpring(y, { stiffness: 200, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * 0.35);
    y.set((e.clientY - cy) * 0.35);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <motion.button
      ref={btnRef}
      onClick={onClick}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      whileTap={{ scale: 0.95 }}
      type="button"
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 36px",
          background: isHovered
            ? "rgba(0,0,0,0.85)"
            : "rgba(0,0,0,0.65)",
          border: "1px solid rgba(255,255,255,0.25)",
          borderRadius: 999,
          backdropFilter: "blur(20px)",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          transition: "background 0.3s ease",
          boxShadow: isHovered
            ? "0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)"
            : "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        {isHovered && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
              pointerEvents: "none",
            }}
          />
        )}

        <MapPin size={18} color="#74c69d" />
        <span
          style={{
            fontFamily: "'Syne', system-ui, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.01em",
          }}
        >
          Find the Nearest Buyer
        </span>

        <motion.span
          animate={{ x: isHovered ? 4 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ color: "rgba(255,255,255,0.6)", fontSize: 18 }}
        >
          →
        </motion.span>
      </div>
    </motion.button>
  );
}

