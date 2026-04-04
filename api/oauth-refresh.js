const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.CLIENT_SECRET

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk
    })

    req.on('end', () => {
      resolve(body)
    })

    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(500).json({ error: 'Missing OAuth client configuration.' })
    return
  }

  try {
    const rawBody = await readRequestBody(req)
    const body = rawBody ? JSON.parse(rawBody) : {}
    const refreshToken = body.refresh_token

    if (!refreshToken) {
      res.status(400).json({ error: 'Missing refresh token.' })
      return
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const payload = await tokenResponse.json().catch(() => null)

    if (!tokenResponse.ok) {
      if (payload?.error === 'invalid_grant') {
        res.status(401).json({ error: 'reauth_required' })
        return
      }

      res
        .status(tokenResponse.status)
        .json(payload ?? { error: 'Token refresh failed.' })
      return
    }

    res.status(200).json(payload)
  } catch {
    res.status(500).json({ error: 'Token refresh failed.' })
  }
}
