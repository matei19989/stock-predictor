import { useRef, useLayoutEffect, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

// ── GSAP: Hero stagger (fires on mount, no scroll trigger) ───

interface HeroStaggerProps {
  children: ReactNode;
  className?: string;
}

export function HeroStagger({ children, className }: HeroStaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(Array.from(el.children), {
        opacity: 0,
        y: 32,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        delay: 0.3,
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}

// ── GSAP: Scroll-triggered reveal (supports x/y direction) ───

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  x?: number;
}

export function ScrollReveal({
  children, className, delay = 0, y = 40, x = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        y,
        x,
        duration: 0.9,
        delay,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      });
    }, el);

    return () => ctx.revert();
  }, [delay, y, x]);

  return <div ref={ref} className={className}>{children}</div>;
}

// ── GSAP: Stagger direct children on scroll ──────────────────

interface StaggerRevealProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}

export function StaggerReveal({
  children, className, stagger = 0.12, y = 40,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(Array.from(el.children), {
        opacity: 0,
        y,
        duration: 0.8,
        stagger,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          toggleActions: 'play none none reverse',
        },
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, y]);

  return <div ref={ref} className={className}>{children}</div>;
}

// ── GSAP: Scale-up on scroll ─────────────────────────────────

interface ScaleRevealProps {
  children: ReactNode;
  className?: string;
}

export function ScaleReveal({ children, className }: ScaleRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        opacity: 0,
        scale: 0.88,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return <div ref={ref} className={className}>{children}</div>;
}

// ── Framer: Card hover lift ──────────────────────────────────

interface MotionCardProps {
  children: ReactNode;
  className?: string;
}

export function MotionCard({ children, className }: MotionCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

// ── Framer: Button hover scale + lift ────────────────────────

interface MotionLiftProps {
  children: ReactNode;
  className?: string;
}

export function MotionLift({ children, className }: MotionLiftProps) {
  return (
    <motion.div
      className={className}
      style={{ display: 'inline-flex' }}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {children}
    </motion.div>
  );
}

// ── Framer: Pulsing status dot ───────────────────────────────

export function PulsingDot({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`absolute h-2.5 w-2.5 rounded-full bg-emerald-400 ${className}`}
      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
