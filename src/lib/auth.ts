export function getCookie(name: string) {
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

export function setCookie(name: string, value: string, maxAgeSeconds: number) {
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
