import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { MagneticButton } from "./MagneticButton";

const WORDS_LINE1 = ["Turn", "Your", "Paddy", "Husk"];
const WORDS_LINE2 = ["into"];
const WORDS_LINE3 = ["Immediate", "Revenue"];

export function HeroText({ onCTAClick }: { onCTAClick: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollY } = useScroll();

  const y = useTransform(scrollY, [0, 400], [0, -80]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const wordVariants = {
    hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        delay: 0.6 + i * 0.08,
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  const lineVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <motion.div
      ref={ref}
      style={{ y, opacity }}
      initial="hidden"
      animate="visible"
      variants={lineVariants}
      className="relative z-10 text-center px-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 28,
          padding: "6px 18px",
          background: "rgba(0,0,0,0.2)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 99,
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 0 8px #fff",
            display: "block",
            animation: "pulse-dot 2s ease infinite",
          }}
        />
        <span
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontFamily: "'DM Mono', monospace",
          }}
        >
          India&apos;s Circular Agri-Economy Platform
        </span>
      </motion.div>

      <motion.div
        variants={lineVariants}
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 14px",
          marginBottom: 4,
        }}
      >
        {WORDS_LINE1.map((word, i) => (
          <motion.span
            key={word}
            custom={i}
            variants={wordVariants}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(40px, 7vw, 88px)",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              display: "block",
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        variants={lineVariants}
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          marginBottom: 4,
        }}
      >
        <motion.span
          custom={4}
          variants={wordVariants}
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(40px, 7vw, 88px)",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {WORDS_LINE2[0]}
        </motion.span>
      </motion.div>

      <motion.div
        variants={lineVariants}
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 14px",
          marginBottom: 36,
        }}
      >
        {WORDS_LINE3.map((word, i) => (
          <motion.span
            key={word}
            custom={5 + i}
            variants={wordVariants}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(40px, 7vw, 88px)",
              fontWeight: 800,
              background:
                "linear-gradient(120deg, #f0a500, #fbbf24, #d4a843)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.03em",
              lineHeight: 1,
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "clamp(16px, 2vw, 20px)",
          fontWeight: 300,
          color: "rgba(255,255,255,0.75)",
          maxWidth: 560,
          margin: "0 auto 44px",
          lineHeight: 1.6,
          letterSpacing: "0.01em",
        }}
      >
        AI-powered platform connecting farmers with buyers. Get instant valuations and discover
        high-value uses for your agricultural waste.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.7, duration: 0.6 }}
      >
        <MagneticButton onClick={onCTAClick} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.8 }}
        style={{
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 24,
          marginTop: 44,
        }}
      >
        {[
          { icon: "🌾", label: "AI-Powered Matching" },
          { icon: "📈", label: "Instant Valuations" },
          { icon: "♻️", label: "100% Free for Farmers" },
        ].map((chip) => (
          <div
            key={chip.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              background: "rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 99,
              backdropFilter: "blur(10px)",
            }}
          >
            <span style={{ fontSize: 14 }}>{chip.icon}</span>
            <span
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {chip.label}
            </span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

