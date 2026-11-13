"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig, motion, useReducedMotion } from "framer-motion";
import { NairaBooksLoader } from "@/components/NairaBooksLoader";

const MIN_VISIBLE_MS = 1800;
const MIN_REDUCED_MS = 350;
const SAFETY_TIMEOUT_MS = 10000;

function getHeadingForHref(pathname: string): string | undefined {
  if (pathname.startsWith("/signup")) return "Opening Company Setup Wizard...";
  if (pathname.startsWith("/overview")) return "Opening Cashflow Overview...";
  if (pathname.startsWith("/transactions")) return "Opening Transactions Hub...";
  if (pathname.startsWith("/books")) return "Opening Your Double-Entry Books...";
  if (pathname.startsWith("/operations")) return "Opening People, Stock & Operations...";
  if (pathname.startsWith("/tax")) return "Checking Nigeria Tax Act 2025...";
  if (pathname.startsWith("/packs")) return "Loading Composable Industry Packs...";
  if (pathname.startsWith("/reconcile")) return "Opening Bank PDF Reconciliation...";
  if (pathname.startsWith("/reports")) return "Opening Reports & Analytics Studio...";
  if (pathname.startsWith("/admin")) return "Opening Maintain & Admin Studio...";
  if (pathname.startsWith("/security")) return "Opening Security & CAMA Audit Trail...";
  if (pathname.startsWith("/login")) return "Opening Workspace Sign In...";
  return undefined;
}

export function RouteLoaderOverlay({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const prefersReduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [heading, setHeading] = useState<string | undefined>(undefined);
  const startedAtRef = useRef<number>(0);
  const hideTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const lastPathnameRef = useRef<string>(pathname);

  const clearTimers = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const startTransitionLoader = useCallback(
    (targetPath: string) => {
      clearTimers();
      startedAtRef.current = Date.now();
      setHeading(getHeadingForHref(targetPath));
      setVisible(true);

      safetyTimerRef.current = window.setTimeout(() => {
        setVisible(false);
      }, SAFETY_TIMEOUT_MS);
    },
    [clearTimers],
  );

  // Immediately show loader when user clicks any internal route <a href="/...">
  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;
      if (anchor.hasAttribute("download")) return;

      const anchorTarget = anchor.getAttribute("target");
      if (anchorTarget && anchorTarget !== "_self") return;

      let resolved: URL;
      try {
        resolved = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (resolved.origin !== window.location.origin) return;

      const sameLocation =
        resolved.pathname === window.location.pathname &&
        resolved.search === window.location.search;
      if (sameLocation) return;

      startTransitionLoader(resolved.pathname);
    }

    function handleCustomStart(event: Event) {
      const detail = (event as CustomEvent<{ href?: string }>).detail;
      startTransitionLoader(detail?.href ?? "/");
    }

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("nb:route-load-start", handleCustomStart);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("nb:route-load-start", handleCustomStart);
    };
  }, [startTransitionLoader]);

  // Keep loader visible cleanly for at least MIN_VISIBLE_MS after arrival
  useEffect(() => {
    if (pathname === lastPathnameRef.current) return;
    lastPathnameRef.current = pathname;

    if (!visible) return;
    const minDuration = prefersReduced ? MIN_REDUCED_MS : MIN_VISIBLE_MS;
    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minDuration - elapsed);

    clearTimers();
    hideTimerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, remaining);
  }, [pathname, visible, prefersReduced, clearTimers]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return (
    <MotionConfig reducedMotion="user">
      {children}

      {visible && (
        <motion.div
          initial={prefersReduced ? false : { opacity: 0.96 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.14, ease: "easeOut" }}
          className="fixed inset-0 z-50 overflow-y-auto bg-[#F2F2F7]"
        >
          <NairaBooksLoader heading={heading} />
        </motion.div>
      )}
    </MotionConfig>
  );
}
