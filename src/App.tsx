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

function hasStoredSession() {
  const token = getCookie('google_access_token')
  const refreshToken = getCookie('google_refresh_token')

  return Boolean(token || refreshToken)
}

function Home() {
  const isSignedIn = hasStoredSession()

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_52%,_#111827_100%)] text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-emerald-300/80">
              Vocalochart
            </p>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Public application overview for Google OAuth verification and approved user access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
              <Link to="/privacy-policy">Privacy Policy</Link>
            </Button>
            <Button asChild className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
              <Link to={isSignedIn ? '/dashboard' : '/login'}>
                {isSignedIn ? 'Open dashboard' : 'Authorized user sign in'}
              </Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 items-center py-12 sm:py-16">
          <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <section className="space-y-8">
              <div className="space-y-5">
                <div className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-emerald-200">
                  Internal YouTube workflow tool
                </div>
                <div className="space-y-4">
                  <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Vocalochart helps authorized me manage YouTube chart and playlist operations.
                  </h1>
                  <p className="max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
                    The application is used by approved internal users to review playlist data, create or
                    update YouTube playlists, and run chart synchronization workflows tied to a configured
                    channel.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Playlist management</CardTitle>
                    <CardDescription className="text-slate-300">
                      Review existing YouTube playlists and create new ones for chart publishing workflows.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Chart sync operations</CardTitle>
                    <CardDescription className="text-slate-300">
                      Trigger scheduled or manual sync jobs that support daily and weekly chart updates.
                    </CardDescription>
                  </CardHeader>
                </Card>

                <Card className="border-white/10 bg-white/5 shadow-2xl shadow-slate-950/30 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Restricted access</CardTitle>
                    <CardDescription className="text-slate-300">
                      Google sign-in is limited to approved internal users who need access to the tool.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </section>

            <Card className="border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/40 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Application details</CardTitle>
                <CardDescription className="text-slate-300">
                  Information visible without login for verification and compliance review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-sm leading-7 text-slate-200">
                <div>
                  <p className="font-medium text-white">Purpose</p>
                  <p className="mt-2 text-slate-300">
                    Vocalochart is a private operations app for maintaining YouTube playlists and chart data.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-white">Google data usage</p>
                  <p className="mt-2 text-slate-300">
                    After sign-in, the app uses Google account and YouTube permissions only to authenticate
                    users and perform playlist-related workflow actions.
                  </p>
                </div>

                <div>
                  <p className="font-medium text-white">Access model</p>
                  <p className="mt-2 text-slate-300">
                    The homepage is public. Operational features stay behind a separate sign-in page and a
                    protected dashboard.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild className="bg-emerald-400 text-slate-950 hover:bg-emerald-300">
                    <Link to={isSignedIn ? '/dashboard' : '/login'}>
                      {isSignedIn ? 'Go to dashboard' : 'Go to sign in'}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" className="text-slate-200 hover:bg-white/10 hover:text-white">
                    <Link to="/terms-of-service">Terms of Service</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

function LoginPage() {
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
            <CardTitle>Sign in to Vocalochart</CardTitle>
            <CardDescription>
              Authorized users can continue to the protected dashboard for YouTube playlist and chart workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={signInWithGoogle} className="w-full">
              Sign in with Google
            </Button>
            <p className="text-xs leading-6 text-slate-400">
              The public application overview is available on the homepage. This page is only for approved user access.
            </p>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link className="underline underline-offset-4 hover:text-white" to="/">
            Homepage
          </Link>
          <span aria-hidden="true">•</span>
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
      <Route path="/login" element={<LoginPage />} />
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
