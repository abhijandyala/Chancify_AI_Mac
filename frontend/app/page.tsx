'use client'

import { useState } from 'react'
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
    <main className="bg-background text-foreground rox-bg-pattern relative">
      <SophisticatedBackground />
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
    </main>
  )
}
