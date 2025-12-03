'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SimpleGoogleOAuth() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)


  const handleGoogleSignIn = () => {
    setIsLoading(true)
    
    // Use real Google OAuth flow like ROX
    // This redirects to the official Google account selection page
    // Using the correct Google Client ID as specified
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '271825853515-ji8bgnlsur2tel6p7gsgn7vn76drdnui.apps.googleusercontent.com'
    
    // Determine redirect URI based on current environment
    // For local development, use localhost; for production, use Railway
    let REDIRECT_URI: string
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      REDIRECT_URI = `${window.location.origin}/api/auth/callback/google`
    } else {
      REDIRECT_URI = 'https://chancifyaipresidential.up.railway.app/api/auth/callback/google'
    }
    
    const SCOPE = 'email profile'
    const STATE = 'google_oauth_state_' + Date.now()
    
    // Create the real Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', SCOPE)
    authUrl.searchParams.set('state', STATE)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'select_account')
    
    // Debug logging
    console.log('=== OAUTH DEBUG INFO ===')
    console.log('Current origin:', window.location.origin)
    console.log('Current hostname:', window.location.hostname)
    console.log('Current URL:', window.location.href)
    console.log('Using redirect URI:', REDIRECT_URI)
    console.log('Full OAuth URL:', authUrl.toString())
    console.log('========================')
    
    // Redirect to real Google OAuth
    window.location.href = authUrl.toString()
  }


  return (
    <button
      onClick={handleGoogleSignIn}
      disabled={isLoading}
      className="w-full bg-white hover:bg-gray-100 disabled:opacity-60 text-black font-semibold py-2.5 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 shadow-sm transition-all duration-200 flex items-center justify-center gap-2 sm:gap-3 text-sm sm:text-base"
    >
      <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span className="hidden sm:inline">{isLoading ? 'Opening Google...' : 'Continue with Google'}</span>
      <span className="sm:hidden">{isLoading ? 'Opening...' : 'Google'}</span>
    </button>
  )
}