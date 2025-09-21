'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RPDLogo } from '@/components/ui/rpd-logo'
import { trackHeroCTAClick, trackLoginModalOpen } from '@/lib/analytics'

// Dynamic import for LoginModal - only load when needed
const LoginModal = dynamic(() => import('@/components/landing/login-modal').then((m) => ({ default: m.LoginModal })), {
  ssr: false
})

export function LandingHero() {
  const [showLogin, setShowLogin] = useState(false)
  const prefersReduced = useReducedMotion()

  const handleLoginClick = () => {
    trackHeroCTAClick('access_dashboard')
    trackLoginModalOpen()
    setShowLogin(true)
  }

  // Removed learn more handler to keep hero minimal

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-24 lg:py-32">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900/90 to-slate-800" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.22)_100%),url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSIxMDgwIiB2aWV3Qm94PSIwIDAgMTkyMCAxMDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJncmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0icmdiYSg1OSwxMzAsMjQ2LDAuMSkiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9InJnYmEoMjM5LDE2OCw3NiwwLjEpIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjE5MjAiIGhlaWdodD0iMTA4MCIgZmlsbD0idXJsKCNncmFkaWVudCkiLz48c3ZnPiA=')] bg-cover bg-center opacity-10" />

      {/* Animated Background Shapes */}
      <motion.div
        className="absolute top-20 left-20 w-72 h-72 bg-amber-400/15 rounded-full blur-3xl"
        animate={prefersReduced ? undefined : {
          scale: [1, 1.12, 1],
          opacity: [0.25, 0.45, 0.25],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl"
        animate={prefersReduced ? undefined : {
          scale: [1.08, 1, 1.08],
          opacity: [0.3, 0.55, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto landing-hero-mobile">
        <div className="landing-hero-grid grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Hero Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="landing-hero-content text-center lg:text-left"
          >
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <RPDLogo size="xl" className="mx-auto lg:mx-0" />
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="landing-text-responsive font-bold text-white leading-[1.05] text-[clamp(40px,7vw,64px)]"
              style={{ textWrap: 'balance' as any }}
            >
              The Powerhouse of
              <span className="block bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
                Real Estate Finance
              </span>
            </motion.h1>

            {/* Clean, classic hero – subtitle and feature pills removed */}

            {/* CTA moved next to headline; extra buttons removed */}
          </motion.div>

          {/* Right Column - CTA aligned to the right edge */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full lg:w-auto flex justify-center lg:justify-end mt-6 lg:mt-12"
          >
            <Button
              onClick={handleLoginClick}
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 group interactive-element h-14 px-8 tracking-wide"
            >
              Access Dashboard
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Login Modal - Only render when needed */}
      {showLogin && <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />}
    </section>
  )
}