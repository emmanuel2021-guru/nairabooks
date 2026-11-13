"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Progressive scroll-reveal hook.
 * Returns `false` during SSR and JSDOM test runs (where IntersectionObserver is absent)
 * so text always stays at full contrast for accessibility audits, while real browsers
 * immediately enable crisp section-by-section scroll choreography.
 */
export function useScrollChoreography() {
  const prefersReduced = useReducedMotion();
  const [canObserve, setCanObserve] = useState(false);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "IntersectionObserver" in window &&
      !prefersReduced
    ) {
      setCanObserve(true);
    }
  }, [prefersReduced]);

  return {
    canAnimate: canObserve && !prefersReduced,
    prefersReduced: Boolean(prefersReduced),
  };
}

/**
 * Runtime-safe replacement for Framer Motion's `useInView` that avoids throwing
 * `ReferenceError: IntersectionObserver is not defined` in JSDOM environments.
 * Defaults to `true` when IntersectionObserver is unavailable, and updates
 * dynamically on every enter/exit in real browsers (`once: false`).
 */
export function useSafeInView(
  ref: React.RefObject<Element | null>,
  { amount = 0.16, rootMargin = "0px 0px -8% 0px" }: { readonly amount?: number; readonly rootMargin?: string } = {},
) {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setInView(entry.isIntersecting);
        }
      },
      { threshold: amount, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, amount, rootMargin]);

  return inView;
}

/**
 * Wraps a landing page section and drives:
 * 1) Smooth continuous scale/elevation scrub as the section enters the viewport.
 * 2) Re-triggerable `isInView` entrance state (`once: false`) so moving into
 *    any section (scrolling down, scrolling up, or jumping via header links)
 *    launches an unmistakable iOS card-deck unfold.
 */
export function AnimatedSection({
  id,
  className,
  children,
  accentLine = true,
}: {
  readonly id?: string;
  readonly className?: string;
  readonly children: React.ReactNode;
  readonly accentLine?: boolean;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const { canAnimate } = useScrollChoreography();
  const isInView = useSafeInView(sectionRef, { amount: 0.12 });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 0.96", "start 0.52"],
  });
  const smoothScroll = useSpring(scrollYProgress, {
    stiffness: 170,
    damping: 26,
    restDelta: 0.001,
  });
  const scrubY = useTransform(smoothScroll, [0, 1], [36, 0]);
  const scrubScale = useTransform(smoothScroll, [0, 1], [0.965, 1]);

  return (
    <section
      ref={sectionRef}
      id={id}
      className={className}
    >
      {accentLine && (
        <div aria-hidden="true" className="mx-auto mb-0 max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={false}
            animate={
              canAnimate
                ? { scaleX: isInView ? 1 : 0.08, opacity: isInView ? 1 : 0.2 }
                : { scaleX: 1, opacity: 1 }
            }
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            style={{ transformOrigin: "0% 50%" }}
            className="h-[2px] w-full rounded-full bg-gradient-to-r from-[#006838]/75 via-[#006838]/25 to-transparent"
          />
        </div>
      )}

      <motion.div
        style={canAnimate ? { y: scrubY, scale: scrubScale } : undefined}
        animate={
          canAnimate
            ? {
                opacity: isInView ? 1 : 0.28,
              }
            : { opacity: 1 }
        }
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/**
 * Reusable directional / spring reveal block triggered whenever the viewport
 * crosses this element (re-triggers cleanly on scroll enter/exit).
 */
export function RevealBlock({
  children,
  className,
  delay = 0,
  yOffset = 32,
  xOffset = 0,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly yOffset?: number;
  readonly xOffset?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { canAnimate } = useScrollChoreography();
  const isInView = useSafeInView(ref, { amount: 0.14 });

  const hiddenState = {
    opacity: 0.08,
    y: yOffset,
    x: xOffset,
    scale: 0.96,
  };

  const visibleState = {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
  };

  return (
    <motion.div
      ref={ref}
      initial={false}
      animate={canAnimate ? (isInView ? visibleState : hiddenState) : visibleState}
      transition={{
        type: "spring",
        stiffness: 240,
        damping: 24,
        delay: canAnimate && isInView ? delay : 0,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
