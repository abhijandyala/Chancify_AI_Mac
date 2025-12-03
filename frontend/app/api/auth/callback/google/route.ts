import { NextRequest, NextResponse } from 'next/server'
import { getApiBaseUrl, withNgrokHeaders } from '@/lib/config'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    // Handle OAuth error - redirect to home page with error
    return NextResponse.redirect(new URL(`/home?error=${error}`, 'https://chancifyaipresidential.up.railway.app'))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/home?error=no_code', 'https://chancifyaipresidential.up.railway.app'))
  }

  try {
    // Prefer server-side GOOGLE_CLIENT_ID, but fall back to NEXT_PUBLIC_GOOGLE_CLIENT_ID
    // Rationale: the browser initiates OAuth with NEXT_PUBLIC_*; using the same value here
    // prevents code-exchange failures and redirect loops caused by ID mismatches.
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    // Check if environment variables are set
    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth environment variables')
      return NextResponse.redirect(new URL('/home?error=missing_config', 'https://chancifyaipresidential.up.railway.app'))
    }

    // ALWAYS use Railway URL - NO localhost fallbacks
    const baseUrl = 'https://chancifyaipresidential.up.railway.app'

    // DEBUG: Log OAuth callback information
    console.log('=== OAUTH CALLBACK DEBUG ===')
    console.log('ALWAYS using Railway URL:', baseUrl)
    console.log('request.url:', request.url)
    console.log('GOOGLE_CLIENT_ID (resolved):', clientId)
    console.log('GOOGLE_CLIENT_SECRET:', clientSecret ? 'SET' : 'NOT SET')
    console.log('============================')

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/auth/callback/google`
    console.log('Redirect URI being sent to Google:', redirectUri)
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const tokens = await tokenResponse.json()
    console.log('Google token response status:', tokenResponse.status)
    console.log('Google token response:', tokens)

    if (!tokens.access_token) {
      console.error('No access token received from Google:', tokens)
      throw new Error(`No access token received: ${JSON.stringify(tokens)}`)
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    const userInfo = await userResponse.json()

    // Call backend API to create user in database
    let backendAccessToken: string | undefined
    try {
      const backendUrl = getApiBaseUrl()
      console.log('🔍 OAuth callback - Backend URL:', backendUrl)
      console.log('🔍 OAuth callback - Environment check:', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        API_BASE_URL: process.env.API_BASE_URL,
        BACKEND_URL: process.env.BACKEND_URL,
      })
      
      const createUserResponse = await fetch(`${backendUrl}/api/auth/google-oauth`, {
        method: 'POST',
        headers: withNgrokHeaders(backendUrl, {
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          email: userInfo.email,
          name: userInfo.name,
          google_id: userInfo.id
        })
      })

      console.log('🔍 Backend response status:', createUserResponse.status)

      if (createUserResponse.ok) {
        const userData = await createUserResponse.json()
        console.log('✅ User created in database:', userData)
        backendAccessToken = userData?.access_token
      } else {
        const errorText = await createUserResponse.text()
        console.error('❌ Failed to create user in database:', {
          status: createUserResponse.status,
          statusText: createUserResponse.statusText,
          error: errorText,
          backendUrl,
        })
        // Don't fail OAuth if backend call fails - user can still log in
        // The frontend will handle missing token gracefully
      }
    } catch (error) {
      console.error('❌ Error calling backend API:', {
        error: error instanceof Error ? error.message : String(error),
        backendUrl: getApiBaseUrl(),
      })
      // Don't fail OAuth if backend call fails - user can still log in
    }

    // Create success URL with user data - redirect to home page
    // CRITICAL: Use Railway URL for redirect, not request.url which might be localhost
    const successUrl = new URL('/home', 'https://chancifyaipresidential.up.railway.app')
    successUrl.searchParams.set('google_auth', 'success')
    successUrl.searchParams.set('email', userInfo.email)
    successUrl.searchParams.set('name', userInfo.name)
    successUrl.searchParams.set('picture', userInfo.picture)
    if (backendAccessToken) {
      successUrl.searchParams.set('token', backendAccessToken)
    }

    console.log('Success redirect URL:', successUrl.toString())
    return NextResponse.redirect(successUrl)

  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/home?error=oauth_failed', 'https://chancifyaipresidential.up.railway.app'))
  }
}