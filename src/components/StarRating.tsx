import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarRating({ rating, max = 5, size = "md", className = "" }: StarRatingProps) {
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  const value = Math.min(max, Math.max(0, Number(rating) || 0));
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  const empty = max - full - half;

  return (
    <div className={`flex items-center gap-0.5 ${className}`} title={`${value.toFixed(1)} / ${max}`}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f-${i}`} className={`${sizeClass} fill-amber-400 text-amber-400`} />
      ))}
      {half ? (
        <Star className={`${sizeClass} fill-amber-400/60 text-amber-400`} />
      ) : null}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e-${i}`} className={`${sizeClass} text-muted-foreground/40`} />
      ))}
      <span className="ml-1.5 text-sm text-muted-foreground">({value.toFixed(1)})</span>
    </div>
  );
}
