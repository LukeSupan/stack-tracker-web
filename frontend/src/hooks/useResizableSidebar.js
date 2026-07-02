import { useEffect, useRef, useState } from "react";
import { readStoredNumber } from "./usePersistedElementSize";

export function useResizableSidebar(storageKey, defaultWidth = 320) {
  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredNumber(storageKey, defaultWidth, 240, 640),
  );
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    function onMouseMove(event) {
      if (!isResizingRef.current) return;
      setSidebarWidth(Math.min(Math.max(event.clientX, 240), 640));
    }

    function onMouseUp() {
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, String(sidebarWidth));
  }, [sidebarWidth, storageKey]);

  function startResize(event) {
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    event.preventDefault();
  }

  return { isDesktop, sidebarWidth, startResize };
}
