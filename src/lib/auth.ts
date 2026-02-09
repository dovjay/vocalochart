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
