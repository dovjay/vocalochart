import { useEffect } from 'react'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { RequireAuth } from '@/components/RequireAuth'
import { getCookie, setCookie } from '@/lib/auth'
import Dashboard from './pages/Dashboard/page'
import { PrivacyPolicyPage, TermsOfServicePage } from './pages/Legal/page'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
const OAUTH_CODE_VERIFIER_KEY = 'google_oauth_code_verifier'
const OAUTH_STATE_KEY = 'google_oauth_state'

function base64UrlEncode(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateCodeVerifier() {
  const bytes = new Uint8Array(64)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function createCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

function generateState() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

async function signInWithGoogle() {
  if (!GOOGLE_CLIENT_ID) {
    alert('Missing VITE_GOOGLE_CLIENT_ID in .env')
    return
  }

  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await createCodeChallenge(codeVerifier)
  const state = generateState()

  sessionStorage.setItem(OAUTH_CODE_VERIFIER_KEY, codeVerifier)
  sessionStorage.setItem(OAUTH_STATE_KEY, state)

  const redirectUri = `${window.location.origin}/oauth/callback`
  const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/youtube')
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=code' +
    `&scope=${scope}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    '&code_challenge_method=S256' +
    '&access_type=offline' +
    '&include_granted_scopes=true' +
    '&prompt=consent'

  window.location.assign(authUrl)
}

function Home() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const reauth = params.get('reauth') === '1'

    if (reauth) {
      void signInWithGoogle()
      return
    }

    const token = getCookie('google_access_token')
    const refreshToken = getCookie('google_refresh_token')
    if (token || refreshToken) {
      navigate('/dashboard', { replace: true })
    }
  }, [location.search, navigate])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Card className="border-slate-800 bg-slate-900/70 shadow-xl">
          <CardHeader>
            <CardTitle>Welcome to Vocalochart</CardTitle>
            <CardDescription>
              Sign in to access internal YouTube playlist and chart workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={signInWithGoogle} className="w-full">
              Sign in with Google
            </Button>
            <p className="text-xs leading-6 text-slate-400">
              Vocalochart is a restricted internal-use application.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link className="underline underline-offset-4 hover:text-white" to="/privacy-policy">
            Privacy Policy
          </Link>
          <span aria-hidden="true">•</span>
          <Link className="underline underline-offset-4 hover:text-white" to="/terms-of-service">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  )
}

function OAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const runCallback = async () => {
      const queryParams = new URLSearchParams(window.location.search)
      const code = queryParams.get('code')
      const error = queryParams.get('error')
      const returnedState = queryParams.get('state')

      if (error) {
        navigate('/', { replace: true })
        return
      }

      const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
      sessionStorage.removeItem(OAUTH_STATE_KEY)

      if (!code || !expectedState || expectedState !== returnedState) {
        navigate('/', { replace: true })
        return
      }

      const codeVerifier = sessionStorage.getItem(OAUTH_CODE_VERIFIER_KEY)
      sessionStorage.removeItem(OAUTH_CODE_VERIFIER_KEY)

      if (!codeVerifier) {
        navigate('/', { replace: true })
        return
      }

      try {
        const redirectUri = `${window.location.origin}/oauth/callback`
        const tokenResponse = await fetch('/api/oauth-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            code_verifier: codeVerifier,
            redirect_uri: redirectUri,
          }),
        })

        if (!tokenResponse.ok) {
          navigate('/', { replace: true })
          return
        }

        const payload = (await tokenResponse.json()) as {
          access_token?: string
          refresh_token?: string
          expires_in?: number
        }

        if (!payload.access_token || !payload.expires_in) {
          navigate('/', { replace: true })
          return
        }

        setCookie('google_access_token', payload.access_token, payload.expires_in)

        if (payload.refresh_token) {
          setCookie('google_refresh_token', payload.refresh_token, 60 * 60 * 24 * 30)
        }

        navigate('/dashboard', { replace: true })
      } catch {
        navigate('/', { replace: true })
      }
    }

    void runCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/70 shadow-xl">
        <CardHeader>
          <CardTitle>Signing you in</CardTitle>
          <CardDescription>Finishing OAuth callback...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-1/3 bg-slate-200 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App
