import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getCookie, setCookie } from '@/lib/auth'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const [status, setStatus] = useState<'checking' | 'ready' | 'unauth' | 'reauth'>(() => {
    const token = getCookie('google_access_token')
    const refreshToken = getCookie('google_refresh_token')

    if (token) {
      return 'ready'
    }

    if (!refreshToken) {
      return 'unauth'
    }

    return 'checking'
  })

  useEffect(() => {
    const refreshToken = getCookie('google_refresh_token')

    if (status !== 'checking' || !refreshToken) {
      return
    }

    let cancelled = false

    const refresh = async () => {
      try {
        const response = await fetch('/api/oauth-refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          if (payload?.error === 'reauth_required') {
            if (!cancelled) {
              setStatus('reauth')
            }
            return
          }

          if (!cancelled) {
            setStatus('unauth')
          }
          return
        }

        if (!payload?.access_token || !payload?.expires_in) {
          if (!cancelled) {
            setStatus('unauth')
          }
          return
        }

        setCookie('google_access_token', payload.access_token, payload.expires_in)

        if (!cancelled) {
          setStatus('ready')
        }
      } catch {
        if (!cancelled) {
          setStatus('unauth')
        }
      }
    }

    void refresh()

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'reauth') {
    return <Navigate to="/?reauth=1" replace state={{ from: location.pathname }} />
  }

  if (status === 'checking') {
    return null
  }

  if (status === 'unauth') {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
