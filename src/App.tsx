import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Dashboard from './pages/Dashboard'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

function signInWithGoogle() {
  if (!GOOGLE_CLIENT_ID) {
    alert('Missing VITE_GOOGLE_CLIENT_ID in .env')
    return
  }

  const redirectUri = `${window.location.origin}/oauth/callback`
  const scope = encodeURIComponent('openid email profile https://www.googleapis.com/auth/youtube')
  const authUrl =
    'https://accounts.google.com/o/oauth2/v2/auth' +
    `?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    '&response_type=token' +
    `&scope=${scope}` +
    '&include_granted_scopes=true' +
    '&prompt=consent'

  window.location.assign(authUrl)
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Max-Age=${maxAgeSeconds}`,
    'Path=/',
    'SameSite=Lax',
  ]

  if (window.location.protocol === 'https:') {
    parts.push('Secure')
  }

  document.cookie = parts.join('; ')
}

function getCookie(name: string) {
  const cookies = document.cookie ? document.cookie.split('; ') : []
  const encodedName = encodeURIComponent(name)

  for (const cookie of cookies) {
    const [key, value] = cookie.split('=')
    if (key === encodedName) {
      return value ? decodeURIComponent(value) : ''
    }
  }

  return null
}

function Home() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = getCookie('google_access_token')
    if (token) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/70 shadow-xl">
        <CardHeader>
          <CardTitle>Welcome to Vocalochart</CardTitle>
          <CardDescription>Sign in to view your YouTube playlists.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signInWithGoogle} className="w-full">
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function OAuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const accessToken = hashParams.get('access_token')

    if (accessToken) {
      setCookie('google_access_token', accessToken, 60 * 60)
      navigate('/dashboard', { replace: true })
      return
    }

    navigate('/', { replace: true })
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
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App
