import { useState, useEffect, useRef } from 'react';

/**
 * Animate a number from 0 (or fromValue) to target over duration ms.
 */
export function useCountUp(
  target: number,
  options: {
    duration?: number;
    fromValue?: number;
  } = {}
) {
  const { duration = 800, fromValue = 0 } = options;
  const [value, setValue] = useState(fromValue);
  const rafRef = useRef<number>();
  const startRef = useRef(fromValue);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startRef.current = value;
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 3);
      const current = startRef.current + (target - startRef.current) * easeOut;
      setValue(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
