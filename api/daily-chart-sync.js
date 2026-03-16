import * as cheerio from 'cheerio'

const BASE_URL = 'https://vocaloard.injpok.tokyo/en/'
const PAGE_SIZE = Number(process.env.VOCALOARD_PAGE_SIZE || '1')
const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN
const DAILY_PLAYLIST_ID = process.env.DAILY_PLAYLIST_ID

function extractLinks(html) {
  const $ = cheerio.load(html)
  const links = []

  $('.RankingItem > a').each((_, element) => {
    const href = $(element).attr('href')
    if (!href) {
      return
    }
    const absolute = new URL(href, BASE_URL).toString()
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

async function fetchPage(page) {
  const url = page > 1 ? `${BASE_URL}?g=${page}` : BASE_URL
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

export default async function handler(req, res) {
  if (!GOOGLE_ACCESS_TOKEN) {
    res.status(500).json({ error: 'Missing GOOGLE_ACCESS_TOKEN' })
    return
  }

  if (!DAILY_PLAYLIST_ID) {
    res.status(500).json({ error: 'Missing DAILY_PLAYLIST_ID' })
    return
  }

  try {
    const allLinks = []

    for (let page = 1; page <= PAGE_SIZE; page += 1) {
      const html = await fetchPage(page)
      const links = extractLinks(html)
      allLinks.push(...links)
    }

    const uniqueLinks = Array.from(new Set(allLinks))
    const ids = uniqueLinks
      .map((link) => extractVideoId(link))
      .filter((id) => id)
      .slice(0, 30)

    if (ids.length === 0) {
      res.status(200).json({ added: 0, failed: [], message: 'No valid YouTube links found.' })
      return
    }

    const desiredSet = new Set(ids)
    const existingItems = await listPlaylistItems({
      playlistId: DAILY_PLAYLIST_ID,
      token: GOOGLE_ACCESS_TOKEN,
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
        token: GOOGLE_ACCESS_TOKEN,
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
            playlistId: DAILY_PLAYLIST_ID,
            videoId,
            position: index,
            token: GOOGLE_ACCESS_TOKEN,
          })
          updated += 1
        }
        continue
      }

      await insertPlaylistItem({
        playlistId: DAILY_PLAYLIST_ID,
        videoId,
        position: index,
        token: GOOGLE_ACCESS_TOKEN,
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
