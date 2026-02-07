import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { PlaylistCard } from './_components/PlaylistCard'
import type { Playlist } from './types'

const CHANNEL_ID = import.meta.env.VITE_YOUTUBE_CHANNEL_ID as string

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

function DashboardPage() {
  const token = getCookie('google_access_token')

  const playlistsQuery = useQuery<Playlist[], Error>({
    queryKey: ['playlists', CHANNEL_ID, token],
    enabled: Boolean(CHANNEL_ID && token),
    queryFn: async () => {
      if (!CHANNEL_ID) {
        throw new Error('Missing VITE_YOUTUBE_CHANNEL_ID in .env')
      }

      if (!token) {
        throw new Error('Missing access token. Please sign in again.')
      }

      const params = new URLSearchParams({
        part: 'id,snippet,contentDetails',
        channelId: CHANNEL_ID,
      })

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error?.message ?? 'Failed to load playlists.'
        throw new Error(message)
      }

      const data = (await response.json()) as { items?: Playlist[] }
      return data.items ?? []
    },
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">Dashboard</h1>
            <Badge className="bg-slate-800 text-slate-100">Playlists</Badge>
          </div>
          <p className="text-slate-400">
            Showing playlists for the configured YouTube channel.
          </p>
        </header>

        <Separator className="bg-slate-800" />

        {playlistsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="border-slate-800 bg-slate-900/70">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : playlistsQuery.isError ? (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle>Unable to load playlists</CardTitle>
              <CardDescription>{playlistsQuery.error.message}</CardDescription>
            </CardHeader>
          </Card>
        ) : (playlistsQuery.data?.length ?? 0) === 0 ? (
          <Card className="border-slate-800 bg-slate-900/70">
            <CardHeader>
              <CardTitle>No playlists found</CardTitle>
              <CardDescription>Try another channel or create playlists.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {playlistsQuery.data?.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                token={token}
                channelId={CHANNEL_ID}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
