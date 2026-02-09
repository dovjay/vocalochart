import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getCookie } from '@/lib/auth'

type RequireAuthProps = {
  children: ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const token = getCookie('google_access_token')

  if (!token) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
