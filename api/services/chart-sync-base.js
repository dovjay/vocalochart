import * as cheerio from 'cheerio'

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.CLIENT_SECRET
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN

function buildPageUrl(baseUrl, page) {
  const url = new URL(baseUrl)
  if (page > 1) {
    url.searchParams.set('g', String(page))
  } else {
    url.searchParams.delete('g')
  }
  return url.toString()
}

function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html)
  const links = []

  $('.RankingItem > a').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) {
      return
    }
    const absolute = new URL(href, baseUrl).toString()
    links.push(absolute)
  })

  return links
}

function extractVideoId(value) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace('/', '')
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }

    if (url.searchParams.has('v')) {
      const id = url.searchParams.get('v')
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }

    const pathMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
    return pathMatch ? pathMatch[1] : null
  } catch {
    const inlineMatch = trimmed.match(/(?:v=|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/)
    return inlineMatch ? inlineMatch[1] : null
  }
}

async function fetchPage(page, baseUrl) {
  const url = buildPageUrl(baseUrl, page)
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'vocaloard-scraper/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status}`)
  }

  return response.text()
}

async function fetchWithRetry(url, options, maxAttempts = 3) {
  let attempt = 0
  let lastMessage = 'Request failed.'

  while (attempt < maxAttempts) {
    const response = await fetch(url, options)
    if (response.ok) {
      return response
    }

    const payload = await response.json().catch(() => null)
    lastMessage = payload?.error?.message ?? `${response.status} ${response.statusText}`
    attempt += 1
  }

  throw new Error(lastMessage)
}

async function refreshAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message = payload?.error_description ?? payload?.error ?? 'Failed to refresh token.'
    throw new Error(message)
  }

  if (!payload?.access_token) {
    throw new Error('Missing access token in refresh response.')
  }

  return payload.access_token
}

async function listPlaylistItems({ playlistId, token }) {
  const items = []
  let nextPageToken = ''

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '50',
      playlistId,
    })
    if (nextPageToken) {
      params.set('pageToken', nextPageToken)
    }

    const response = await fetchWithRetry(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    const payload = await response.json()

    for (const item of payload.items || []) {
      const videoId = item?.snippet?.resourceId?.videoId
      if (videoId) {
        items.push({
          playlistItemId: item.id,
          videoId,
          position: item?.snippet?.position ?? 0,
        })
      }
    }

    nextPageToken = payload.nextPageToken || ''
  } while (nextPageToken)

  return items
}

async function deletePlaylistItem({ playlistItemId, token }) {
  await fetchWithRetry(
    `https://www.googleapis.com/youtube/v3/playlistItems?id=${playlistItemId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )
}

async function updatePlaylistItemPosition({ playlistItemId, playlistId, videoId, position, token }) {
  await fetchWithRetry(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet',
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: playlistItemId,
        snippet: {
          playlistId,
          position,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      }),
    },
  )
}

async function insertPlaylistItem({ playlistId, videoId, position, token }) {
  await fetchWithRetry(
    'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          playlistId,
          position,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      }),
    },
  )
}

export function createChartSyncHandler({ baseUrl, playlistId, pageSize, maxVideos }) {
  return async function handler(req, res) {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
      res.status(500).json({ error: 'Missing Google OAuth configuration.' })
      return
    }

    if (!baseUrl) {
      res.status(500).json({ error: 'Missing baseUrl configuration.' })
      return
    }

    if (!playlistId) {
      res.status(500).json({ error: 'Missing playlistId configuration.' })
      return
    }

    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1
    const safeMaxVideos = Number.isFinite(maxVideos) && maxVideos > 0 ? maxVideos : 30

    try {
      const accessToken = await refreshAccessToken()
      const allLinks = []

      for (let page = 1; page <= safePageSize; page += 1) {
        const html = await fetchPage(page, baseUrl)
        const links = extractLinks(html, baseUrl)
        allLinks.push(...links)
      }

      const uniqueLinks = Array.from(new Set(allLinks))
      const ids = uniqueLinks
        .map((link) => extractVideoId(link))
        .filter((id) => id)
        .slice(0, safeMaxVideos)

      if (ids.length === 0) {
        res.status(200).json({ added: 0, failed: [], message: 'No valid YouTube links found.' })
        return
      }

      const desiredSet = new Set(ids)
      const existingItems = await listPlaylistItems({
        playlistId,
        token: accessToken,
      })
      const retained = new Map()
      const toDelete = []

      for (const item of existingItems) {
        if (!desiredSet.has(item.videoId)) {
          toDelete.push(item)
          continue
        }

        if (retained.has(item.videoId)) {
          toDelete.push(item)
          continue
        }

        retained.set(item.videoId, item)
      }

      let deleted = 0
      let updated = 0
      let added = 0

      for (const item of toDelete) {
        await deletePlaylistItem({
          playlistItemId: item.playlistItemId,
          token: accessToken,
        })
        deleted += 1
      }

      for (let index = 0; index < ids.length; index += 1) {
        const videoId = ids[index]
        const existing = retained.get(videoId)

        if (existing) {
          if (existing.position !== index) {
            await updatePlaylistItemPosition({
              playlistItemId: existing.playlistItemId,
              playlistId,
              videoId,
              position: index,
              token: accessToken,
            })
            updated += 1
          }
          continue
        }

        await insertPlaylistItem({
          playlistId,
          videoId,
          position: index,
          token: accessToken,
        })
        added += 1
      }

      res.status(200).json({
        total: ids.length,
        added,
        updated,
        deleted,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.'
      res.status(500).json({ error: message })
    }
  }
}
