'use client'

import { useState } from 'react'
import Spline from '@splinetool/react-spline/next'
import ROXNav from '@/components/layout/ROXNav'
import ROXHero from '@/components/ui/ROXHero'
import ROXClientMarquee from '@/components/ui/ROXClientMarquee'
import ROXAgenticWorkflows from '@/components/ui/ROXAgenticWorkflows'
import ROXLogoMarquee from '@/components/ui/ROXLogoMarquee'
import ROXFloatingElements from '@/components/ui/ROXFloatingElements'
import ROXTestimonialSection from '@/components/ui/ROXTestimonialSection'
import ROXEnterprise from '@/components/ui/ROXEnterprise'
import ROXMegaFooter from '@/components/ui/ROXMegaFooter'
import SophisticatedBackground from '@/components/ui/SophisticatedBackground'
import CookieBanner from '@/components/ui/CookieBanner'
import CookiesPolicyModal from '@/components/ui/CookiesPolicyModal'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        url?: string
      }
    }
  }
}

const SPLINE_SCENE = 'https://prod.spline.design/DdK2yhoCZ5ObcJ8o/scene.splinecode'

function SplineBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" style={{ minHeight: '100vh' }}>
      <Spline
        scene={SPLINE_SCENE}
        className="h-full w-full"
        style={{
          minHeight: '100vh',
          opacity: 0.9,
          filter: 'saturate(1) brightness(1.02)',
        }}
      />
    </div>
  )
}

export default function ROXLandingPage() {
  const [showCookiesModal, setShowCookiesModal] = useState(false)

  const handleCookieAccept = () => {
    console.log('Cookies accepted')
  }

  const handleCookieDecline = () => {
    console.log('Cookies declined')
  }

  const handleShowCookiesPolicy = () => {
    setShowCookiesModal(true)
  }

  return (
    <main className="bg-background text-foreground rox-bg-pattern relative min-h-screen">
      <SplineBackground />
      <div className="pointer-events-none absolute inset-0 z-10">
        <SophisticatedBackground />
      </div>
      <div className="relative z-20 min-h-screen">
      <ROXNav />
      <ROXHero />
      <ROXClientMarquee />
      <ROXAgenticWorkflows />
      <ROXLogoMarquee />
      <ROXFloatingElements />
      <ROXTestimonialSection />
      <ROXEnterprise />
      <ROXMegaFooter />

      {/* Cookie Banner */}
      <CookieBanner
        onAccept={handleCookieAccept}
        onDecline={handleCookieDecline}
        onShowPolicy={handleShowCookiesPolicy}
      />

      {/* Cookies Policy Modal */}
      <CookiesPolicyModal
        isOpen={showCookiesModal}
        onClose={() => setShowCookiesModal(false)}
      />
      </div>
    </main>
  )
}
