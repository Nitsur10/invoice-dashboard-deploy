// Analytics tracking utilities for landing page
// This provides a foundation for Google Analytics, Mixpanel, or other analytics platforms

interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
  category?: string
}

class Analytics {
  private isEnabled: boolean = false
  private userId?: string

  constructor() {
    // Only enable analytics in production
    this.isEnabled = process.env.NODE_ENV === 'production'
  }

  // Initialize analytics (call this in app startup)
  init(config?: { userId?: string; platform?: string }) {
    if (!this.isEnabled) return

    this.userId = config?.userId

    // Example: Initialize Google Analytics
    if (typeof window !== 'undefined') {
      // Google Analytics initialization would go here
      console.log('Analytics initialized')
    }
  }

  // Track page views
  trackPageView(page: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return

    const event = {
      name: 'page_view',
      properties: {
        page,
        timestamp: new Date().toISOString(),
        user_id: this.userId,
        ...properties
      }
    }

    this.sendEvent(event)
  }

  // Track user interactions
  trackEvent(name: string, properties?: Record<string, any>, category?: string) {
    if (!this.isEnabled) return

    const event = {
      name,
      category: category || 'interaction',
      properties: {
        timestamp: new Date().toISOString(),
        user_id: this.userId,
        ...properties
      }
    }

    this.sendEvent(event)
  }

  // Track conversion events
  trackConversion(type: string, properties?: Record<string, any>) {
    if (!this.isEnabled) return

    this.trackEvent('conversion', {
      conversion_type: type,
      ...properties
    }, 'conversion')
  }

  // Track landing page specific events
  trackLandingPageEvent(action: string, properties?: Record<string, any>) {
    this.trackEvent('landing_page_interaction', {
      action,
      ...properties
    }, 'landing_page')
  }

  // Private method to send events to analytics platform
  private sendEvent(event: AnalyticsEvent) {
    // In a real implementation, this would send to your analytics platform
    // Examples:
    // - Google Analytics: gtag('event', event.name, event.properties)
    // - Mixpanel: mixpanel.track(event.name, event.properties)
    // - Custom API: fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) })

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event)
    }
  }
}

// Export singleton instance
export const analytics = new Analytics()

// Convenience functions for common tracking scenarios
export const trackLandingPageView = () => {
  analytics.trackPageView('/landing')
}

export const trackHeroCTAClick = (cta: string) => {
  analytics.trackLandingPageEvent('hero_cta_click', { cta_type: cta })
}

export const trackLoginModalOpen = () => {
  analytics.trackLandingPageEvent('login_modal_open')
}

export const trackLoginAttempt = (step: string) => {
  analytics.trackLandingPageEvent('login_attempt', { step })
}

export const trackLoginSuccess = () => {
  analytics.trackConversion('login_success')
}

export const trackFeatureCardClick = (feature: string) => {
  analytics.trackLandingPageEvent('feature_card_click', { feature })
}

export const trackTestimonialView = (testimonial: string) => {
  analytics.trackLandingPageEvent('testimonial_view', { testimonial })
}

export const trackFooterCTAClick = (cta: string) => {
  analytics.trackLandingPageEvent('footer_cta_click', { cta_type: cta })
}