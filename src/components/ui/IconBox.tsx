import type { ReactNode } from "react";

interface IconBoxProps {
  icon: ReactNode;
  size?: "sm" | "md" | "lg";
  bg?: string;
  border?: string;
}

const sizeConfig = {
  sm: { box: 30, radius: 8 },
  md: { box: 40, radius: 10 },
  lg: { box: 52, radius: 14 },
} as const;

export function IconBox({
  icon,
  size = "md",
  bg = "rgba(34,197,94,0.08)",
  border = "rgba(134,195,94,0.15)",
}: IconBoxProps) {
  const cfg = sizeConfig[size] ?? sizeConfig.md;

  return (
    <div
      style={{
        width: cfg.box,
        height: cfg.box,
        borderRadius: cfg.radius,
        background: bg,
        border: `1px solid ${border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
  );
}

