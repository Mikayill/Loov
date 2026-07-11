"use client";

import { useEffect, useState } from "react";

/**
 * Keeps a component mounted for `exitDurationMs` after `isOpen` flips to
 * false, so a CSS exit animation (e.g. `animate-pop-out`) has time to play
 * before the node actually leaves the DOM.
 */
export function useDelayedUnmount(isOpen: boolean, exitDurationMs: number) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isOpen) {
      setShouldRender(true);
    } else if (shouldRender) {
      timer = setTimeout(() => setShouldRender(false), exitDurationMs);
    }
    return () => clearTimeout(timer);
  }, [isOpen, exitDurationMs, shouldRender]);

  return shouldRender;
}
