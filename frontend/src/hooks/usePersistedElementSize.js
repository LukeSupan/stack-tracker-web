import { useEffect } from "react";

export function readStoredNumber(key, fallback, min = 0, max = Infinity) {
  const parsed = Number.parseInt(localStorage.getItem(key) || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

export function usePersistedElementHeight(ref, key, observerKey = null) {
  useEffect(() => {
    const element = ref.current;
    if (!element || !window.ResizeObserver) return undefined;

    let animationFrame = null;
    const observer = new ResizeObserver(([entry]) => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        localStorage.setItem(key, String(Math.round(entry.contentRect.height)));
      });
    });

    observer.observe(element);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [ref, key, observerKey]);
}
