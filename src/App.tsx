import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import './App.css'

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
    <div>
      <h1>Welcome to Vocalochart</h1>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
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

  return null
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
