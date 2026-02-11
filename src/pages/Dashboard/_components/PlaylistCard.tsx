import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Playlist } from '../types'

type UploadSummary = {
  added: number
  failed: Array<{ videoId: string; message: string }>
}

type UploadLogItem = {
  videoId: string
  status: 'success' | 'failed'
  message: string
}

type UploadItem = {
  videoId: string
  position?: number
}

type PlaylistCardProps = {
  playlist: Playlist
  token: string | null
  channelId: string
}

function extractVideoId(value: string) {
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

function parseVideoIds(text: string) {
  const tokens = text.split(/\s+/)
  const ids = new Set<string>()

  for (const token of tokens) {
    const id = extractVideoId(token)
    if (id) {
      ids.add(id)
    }
  }

  return Array.from(ids)
}

export function PlaylistCard({ playlist, token, channelId }: PlaylistCardProps) {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [singleUrl, setSingleUrl] = useState('')
  const [singlePosition, setSinglePosition] = useState('')
  const [fileText, setFileText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [uploadLog, setUploadLog] = useState<UploadLogItem[]>([])
  const [uploadTotal, setUploadTotal] = useState(0)
  const [uploadCompleted, setUploadCompleted] = useState(0)
  const [showLog, setShowLog] = useState(false)

  const combinedInput = useMemo(
    () => [manualInput, fileText].filter(Boolean).join('\n'),
    [manualInput, fileText],
  )

  const uploadMutation = useMutation<UploadSummary, Error, { playlistId: string; items: UploadItem[] }>({
    mutationFn: async ({ playlistId, items }) => {
      if (!token) {
        throw new Error('Missing access token. Please sign in again.')
      }

      const summary: UploadSummary = { added: 0, failed: [] }
      let completed = 0
      const maxAttempts = 3

      for (const item of items) {
        let attempt = 0
        let lastMessage = 'Failed to add video.'
        let succeeded = false

        while (attempt < maxAttempts && !succeeded) {
          const response = await fetch(
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
                  position: item.position,
                  resourceId: {
                    kind: 'youtube#video',
                    videoId: item.videoId,
                  },
                },
              }),
            },
          )

          if (response.ok) {
            succeeded = true
            break
          }

          const payload = await response.json().catch(() => null)
          lastMessage = payload?.error?.message ?? lastMessage
          attempt += 1
        }

        if (!succeeded) {
          summary.failed.push({ videoId: item.videoId, message: lastMessage })
          setUploadLog((prev) => [
            ...prev,
            { videoId: item.videoId, status: 'failed', message: lastMessage },
          ])
          completed += 1
          setUploadCompleted(completed)
          continue
        }

        summary.added += 1
        setUploadLog((prev) => [
          ...prev,
          { videoId: item.videoId, status: 'success', message: 'Added to playlist.' },
        ])
        completed += 1
        setUploadCompleted(completed)
      }

      if (summary.added === 0 && summary.failed.length > 0) {
        throw new Error(summary.failed[0].message)
      }

      return summary
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['playlists', channelId, token] })
    },
  })

  const handleOpenDialog = () => {
    setManualInput('')
    setSingleUrl('')
    setSinglePosition('')
    setFileText('')
    setFileName(null)
    setStatusMessage(null)
    setParseError(null)
    setUploadLog([])
    setUploadTotal(0)
    setUploadCompleted(0)
    setShowLog(false)
    setIsDialogOpen(true)
  }

  const handleFileLoad = async (file: File) => {
    const text = await file.text()
    setFileText(text)
    setFileName(file.name)
  }

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      await handleFileLoad(file)
    }
  }

  const handleUpload = async () => {
    setStatusMessage(null)
    setParseError(null)
    setUploadLog([])

    const ids = parseVideoIds(combinedInput)
    const singleId = singleUrl ? extractVideoId(singleUrl) : null
    const positionValue = singlePosition.trim() === '' ? null : Number(singlePosition)
    const hasValidPosition = positionValue !== null && Number.isInteger(positionValue) && positionValue >= 0

    if (singleUrl && !singleId) {
      setParseError('Single URL is invalid. Provide a valid YouTube URL or video ID.')
      return
    }

    if (singlePosition && !hasValidPosition) {
      setParseError('Position must be a non-negative integer.')
      return
    }

    const items: UploadItem[] = []
    if (singleId) {
      items.push({ videoId: singleId, position: hasValidPosition ? positionValue ?? undefined : undefined })
    }

    for (const id of ids) {
      if (id !== singleId) {
        items.push({ videoId: id })
      }
    }

    if (items.length === 0) {
      setParseError('Add at least one YouTube URL or video ID.')
      return
    }

    setUploadTotal(items.length)
    setUploadCompleted(0)

    try {
      const result = await uploadMutation.mutateAsync({
        playlistId: playlist.id,
        items,
      })

      const failedCount = result.failed.length
      const summary =
        `Added ${result.added} video${result.added === 1 ? '' : 's'}.` +
        (failedCount ? ` Failed ${failedCount}.` : '')

      setStatusMessage(summary)
      setShowLog(true)
      if (failedCount) {
        setParseError(
          `Failed IDs: ${result.failed.slice(0, 3).map((item) => item.videoId).join(', ')}`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.'
      setParseError(message)
    }
  }

  return (
    <>
      <Card className="border-slate-800 bg-slate-900/70">
        <CardHeader>
          <CardTitle>{playlist.snippet.title}</CardTitle>
          <CardDescription>
            {playlist.snippet.description || 'No description provided.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Videos</span>
            <Badge className="bg-slate-800 text-slate-100">
              {playlist.contentDetails.itemCount}
            </Badge>
          </div>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-800 hover:bg-slate-800 hover:text-slate-100"
            onClick={handleOpenDialog}
            disabled={!token}
          >
            Add videos
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-50">
          <DialogHeader>
            <DialogTitle>Add videos to {playlist.snippet.title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Paste YouTube URLs or video IDs, or drop a .txt file below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`video-urls-${playlist.id}`}>Video URLs or IDs</Label>
              <Textarea
                id={`video-urls-${playlist.id}`}
                value={manualInput}
                onChange={(event) => setManualInput(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="min-h-[140px]"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`single-url-${playlist.id}`}>Single URL or ID</Label>
                <Input
                  id={`single-url-${playlist.id}`}
                  value={singleUrl}
                  onChange={(event) => setSingleUrl(event.target.value)}
                  placeholder="https://youtu.be/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`single-position-${playlist.id}`}>Position (optional)</Label>
                <Input
                  id={`single-position-${playlist.id}`}
                  type="number"
                  min="0"
                  value={singlePosition}
                  onChange={(event) => setSinglePosition(event.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div
              className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-300"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex flex-col gap-2">
                <span>Drag and drop a .txt file here</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".txt"
                    className="file:text-slate-100"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        void handleFileLoad(file)
                      }
                    }}
                  />
                  {fileName ? (
                    <span className="text-xs text-slate-400">{fileName}</span>
                  ) : null}
                </div>
              </div>
            </div>

            {statusMessage ? (
              <p className="text-sm text-emerald-300">{statusMessage}</p>
            ) : null}
            {parseError ? (
              <p className="text-sm text-rose-300">{parseError}</p>
            ) : null}

            {uploadTotal > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Upload progress</span>
                  <span>
                    {uploadCompleted}/{uploadTotal}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.min(100, (uploadCompleted / uploadTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            {uploadLog.length > 0 ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 text-slate-800 hover:bg-slate-800 hover:text-slate-100"
                  onClick={() => setShowLog((prev) => !prev)}
                >
                  {showLog ? 'Hide log' : 'Show log'}
                </Button>
                {showLog ? (
                  <div className="max-h-48 space-y-2 overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs">
                    {uploadLog.map((entry, index) => (
                      <div key={`${entry.videoId}-${index}`} className="flex gap-2">
                        <span
                          className={
                            entry.status === 'success'
                              ? 'text-emerald-300'
                              : 'text-rose-300'
                          }
                        >
                          {entry.status.toUpperCase()}
                        </span>
                        <span className="text-slate-200">{entry.videoId}</span>
                        <span className="text-slate-400">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-slate-700 text-slate-800 hover:bg-slate-800 hover:text-slate-100"
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload videos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
