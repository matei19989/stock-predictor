import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import {
  Brain, ChartLine, Star, Newspaper,
  ArrowRight, MagnifyingGlass, ChartBar, Crosshair,
} from '@phosphor-icons/react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  HeroStagger, ScrollReveal, StaggerReveal, ScaleReveal,
  MotionCard, MotionLift, PulsingDot,
} from '@/components/landing/animations';
import TorusKnotScene from '@/components/landing/TorusKnotScene';
import heroBg from '@/assets/hero-bg.webp';
import chartBg from '@/assets/chart-bg.png';

const FEATURES = [
  {
    icon: Brain,
    title: 'ML-Powered Signals',
    desc: 'XGBoost classifier trained on 5 years of data. Five trading signals ranked by confidence with full probability breakdowns.',
  },
  {
    icon: Newspaper,
    title: 'News Sentiment',
    desc: 'GDELT sentiment analysis from 66M+ global news articles. Coverage across 84% of the S\u200a&\u200aP\u00a0500.',
  },
  {
    icon: Star,
    title: 'Watchlist Tracking',
    desc: 'Track any S\u200a&\u200aP\u00a0500 stock. See live price, daily change, and the latest ML signal at a glance.',
  },
  {
    icon: ChartLine,
    title: 'Interactive Charts',
    desc: 'Candlestick charts with volume overlay, 52-week range, and flexible time horizons \u2014 powered by TradingView.',
  },
];

const STATS = [
  { value: '22', label: 'Technical Features' },
  { value: '66M+', label: 'News Articles' },
  { value: 'S&P 500', label: 'Market Coverage' },
  { value: '5', label: 'Signal Classes' },
];

const STEPS = [
  { icon: MagnifyingGlass, title: 'Search', desc: 'Find any S&P\u00a0500 stock by ticker or company name.' },
  { icon: ChartBar, title: 'Analyze', desc: 'ML model evaluates 22 technical features plus news sentiment.' },
  { icon: Crosshair, title: 'Decide', desc: 'Get a clear signal \u2014 from Strong\u00a0Sell to Strong\u00a0Buy.' },
];

export default function LandingPage() {
  useDocumentTitle('');

  return (
    <div className="relative bg-[#07080d] text-white overflow-x-hidden font-body">
      {/* ── Noise texture overlay ─────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-[60] opacity-[0.035]">
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </div>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080d]/85 via-[#07080d]/30 to-[#07080d]" />

        {/* hero glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[700px] h-[350px] bg-purple-600/[0.08] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-[100px] -right-[150px] w-[500px] h-[500px] bg-teal-500/[0.06] rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute top-[15%] -left-[200px] w-[400px] h-[400px] bg-pink-500/[0.04] rounded-full blur-[150px] pointer-events-none" />

        {/* nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5">
          <span className="font-heading text-lg font-bold tracking-[-0.02em]">Grafynt</span>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild size="sm" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white">
              <Link to="/register">Get Started</Link>
            </Button>
          </div>
        </nav>

        {/* hero content — GSAP stagger on mount */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
          <HeroStagger className="max-w-4xl space-y-8">
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-[80px] font-bold tracking-[-0.04em] leading-[0.95]">
              See the signal.
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
                Make the move.
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg sm:text-xl font-light text-gray-400 leading-[1.8]">
              XGBoost-powered trading signals — Strong&nbsp;Sell to Strong&nbsp;Buy — built on
              22&nbsp;technical indicators and sentiment from 66&nbsp;million news&nbsp;articles.
            </p>

            <div className="flex items-center justify-center gap-4 pt-2">
              <MotionLift>
                <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-8 h-12 text-base font-medium rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:shadow-[0_0_60px_rgba(168,85,247,0.35)] transition-shadow">
                  <Link to="/register">
                    Get Started Free
                    <ArrowRight weight="bold" size={18} className="ml-2" />
                  </Link>
                </Button>
              </MotionLift>
              <MotionLift>
                <Button asChild variant="ghost" size="lg" className="text-gray-300 hover:text-white hover:bg-white/10 px-8 h-12 text-base rounded-xl">
                  <Link to="/login">Sign In</Link>
                </Button>
              </MotionLift>
            </div>
          </HeroStagger>
        </div>

        {/* scroll indicator */}
        <div className="relative z-10 pb-12 flex justify-center animate-fade-in delay-700">
          <div className="w-[22px] h-[34px] rounded-full border-2 border-white/15 flex justify-center pt-2">
            <div className="w-[3px] h-[7px] rounded-full bg-white/50 animate-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ── Stats strip — GSAP stagger on scroll ─────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute -left-[150px] top-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-teal-500/[0.05] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -right-[100px] top-1/2 -translate-y-1/2 w-[300px] h-[200px] bg-purple-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        <StaggerReveal className="relative z-10 max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-4 py-14 px-6" stagger={0.1}>
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.04em] bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                {value}
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mt-2">{label}</p>
            </div>
          ))}
        </StaggerReveal>
      </section>

      {/* ── Features — 3D torus knot bg + GSAP slide-in ────────── */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute -left-[250px] top-[10%] w-[550px] h-[550px] bg-teal-500/[0.06] rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute -right-[200px] bottom-[5%] w-[450px] h-[450px] bg-pink-500/[0.05] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[300px] h-[200px] bg-purple-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

        {/* 3D torus knot — fills entire section background */}
        <div className="absolute inset-0 z-0">
          <TorusKnotScene />
        </div>
        {/* edge faders — blend section into neighbours */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#07080d] to-transparent z-[1] pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#07080d] to-transparent z-[1] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal className="text-center mb-16 space-y-4">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.04em] leading-tight">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                trade smarter
              </span>
            </h2>
            <p className="font-light text-gray-400 max-w-xl mx-auto leading-[1.8]">
              From raw market data to actionable signals — Grafynt handles
              the analysis so you can focus on decisions.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <ScrollReveal key={title} x={i % 2 === 0 ? -30 : 30} y={0} delay={i * 0.08}>
                <MotionCard className="group rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-7 sm:p-8 transition-all duration-300 hover:border-purple-500/25 hover:bg-white/[0.08] hover:shadow-[0_0_40px_rgba(20,184,166,0.06)]">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 transition-colors group-hover:bg-purple-500/20">
                    <Icon size={22} weight="duotone" />
                  </div>
                  <h3 className="font-heading text-lg font-bold tracking-[-0.02em] mb-2">{title}</h3>
                  <p className="text-sm font-light text-gray-400 leading-[1.8]">{desc}</p>
                </MotionCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Chart background wrapper (steps + CTA) ─────────────── */}
      <div className="relative">
        {/* chart image — very low opacity, blended with vignette */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.18]"
          style={{ backgroundImage: `url(${chartBg})` }}
        />
        {/* vertical vignette — fades top/bottom into page bg */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080d] via-transparent to-[#07080d]" />
        {/* horizontal vignette — softens left/right edges */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07080d]/50 via-transparent to-[#07080d]/50" />

      {/* ── How it works — GSAP stagger + Framer pulse ────────── */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute left-1/2 -translate-x-1/2 top-[20%] w-[600px] h-[350px] bg-teal-500/[0.05] rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute -right-[200px] top-[40%] w-[350px] h-[350px] bg-purple-500/[0.04] rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <ScrollReveal className="mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.04em] leading-tight text-center">
              Three steps to{' '}
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                smarter trades
              </span>
            </h2>
          </ScrollReveal>

          <StaggerReveal className="grid grid-cols-1 sm:grid-cols-3 gap-14 sm:gap-8" stagger={0.15}>
            {STEPS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative flex flex-col items-center text-center">
                {i < 2 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+32px)] w-[calc(100%-64px)] h-px bg-gradient-to-r from-purple-500/30 to-pink-500/10" />
                )}
                <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-[0_0_28px_rgba(168,85,247,0.25)]">
                  <Icon size={20} weight="bold" />
                  <PulsingDot className="-top-0.5 -right-0.5" />
                </div>
                <span className="text-[10px] font-medium tracking-[0.25em] text-gray-500 uppercase mb-2">
                  Step 0{i + 1}
                </span>
                <h3 className="font-heading text-lg font-bold tracking-[-0.02em] mb-1">{title}</h3>
                <p className="text-sm font-light text-gray-400 leading-[1.8] max-w-[240px]">{desc}</p>
              </div>
            ))}
          </StaggerReveal>
        </div>
      </section>

      {/* ── CTA — GSAP scale-up + Framer button lift ─────────── */}
      <section className="relative py-24 sm:py-32 px-6 overflow-hidden">
        <div className="absolute left-1/3 top-1/2 -translate-y-1/2 w-[500px] h-[400px] bg-teal-500/[0.05] rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute right-1/4 top-1/3 w-[350px] h-[350px] bg-purple-600/[0.06] rounded-full blur-[140px] pointer-events-none" />

        <ScaleReveal className="relative z-10 max-w-3xl mx-auto">
          <div className="text-center rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-12 sm:p-16 space-y-8">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-[-0.04em] leading-tight">
              Ready to see the signal?
            </h2>
            <p className="font-light text-gray-400 max-w-lg mx-auto leading-[1.8]">
              Create a free account and get your first ML-powered trading signal
              in under a minute.
            </p>
            <MotionLift>
              <Button asChild size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 px-8 h-12 text-base font-medium rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.25)] hover:shadow-[0_0_60px_rgba(168,85,247,0.35)] transition-shadow">
                <Link to="/register">
                  Get Started Free
                  <ArrowRight weight="bold" size={18} className="ml-2" />
                </Link>
              </Button>
            </MotionLift>
          </div>
        </ScaleReveal>
      </section>

      </div>{/* end chart background wrapper */}

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-10 text-center text-sm text-gray-500 tracking-[0.1em] uppercase">
        Grafynt
      </footer>
    </div>
  );
}
