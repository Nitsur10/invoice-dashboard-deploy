'use client'

import { useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { analytics, trackLandingPageView } from '@/lib/analytics'
import { LandingHero } from '@/components/landing/landing-hero'
import ErrorBoundary from '@/components/error-boundary'

// Dynamic imports for better performance
const LandingFeatures = dynamic(() => import('@/components/landing/landing-features').then((m) => ({ default: m.LandingFeatures })), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
})

const LandingTestimonials = dynamic(() => import('@/components/landing/landing-testimonials').then((m) => ({ default: m.LandingTestimonials })), {
  ssr: false,
  loading: () => <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
})

const LandingFooter = dynamic(() => import('@/components/landing/landing-footer').then((m) => ({ default: m.LandingFooter })), {
  ssr: false,
  loading: () => <div className="h-32 bg-slate-800 animate-pulse" />
})

export default function LandingPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Initialize analytics
    analytics.init()
    trackLandingPageView()

    const checkUser = async () => {
      try {
        // Only check auth if supabase is properly configured
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            router.replace('/overview')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // Continue showing landing page if auth check fails
        // This ensures landing page always shows for unauthenticated users
      }
    }

    // Small delay to ensure page loads first
    const timer = setTimeout(checkUser, 100)
    return () => clearTimeout(timer)
  }, [router, supabase])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-amber-50/20">
        <ErrorBoundary>
          <LandingHero />
        </ErrorBoundary>
        <Suspense fallback={<div className="h-96 bg-slate-100 animate-pulse rounded-xl mx-8" />}>
          <ErrorBoundary>
            <LandingFeatures />
          </ErrorBoundary>
        </Suspense>
        <Suspense fallback={<div className="h-96 bg-slate-100 animate-pulse rounded-xl mx-8" />}>
          <ErrorBoundary>
            <LandingTestimonials />
          </ErrorBoundary>
        </Suspense>
        <Suspense fallback={<div className="h-32 bg-slate-800 animate-pulse" />}>
          <ErrorBoundary>
            <LandingFooter />
          </ErrorBoundary>
        </Suspense>
      </div>
    </ErrorBoundary>
  )
}