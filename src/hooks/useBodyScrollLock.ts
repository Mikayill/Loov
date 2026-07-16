"use client";

import { useEffect } from "react";

/**
 * Reference-counted body scroll lock. Before this, QuickViewButton,
 * CartDrawer and BundleQuickView each independently set
 * `document.body.style.overflow = "hidden"` and cleared it on their own
 * unmount/close — with no counter. If two of them were ever open at once
 * (e.g. Quick View opened while the Cart drawer was already open, or one
 * closing mid-navigation while another is still mounted), the first one to
 * close would blow away the lock the other still needed, leaving the body's
 * overflow/scrollbar-padding in a broken, inconsistent state — this is what
 * produced the "page shrinks / becomes extra scrollable" bug when opening a
 * product's Quick View from the deals-filtered products view.
 *
 * A module-level counter fixes this: the lock is only actually released once
 * the LAST open consumer closes.
 */
let lockCount = 0;
let savedPaddingRight = "";

function lock() {
  if (lockCount === 0) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    savedPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  }
  lockCount++;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
    document.body.style.paddingRight = savedPaddingRight;
  }
}

/** Locks body scroll (+ reserves scrollbar width) while `active` is true. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return () => unlock();
  }, [active]);
}
