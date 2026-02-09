import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
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

type CreatePlaylistModalProps = {
  token: string | null
  channelId: string
}

export function CreatePlaylistModal({ token, channelId }: CreatePlaylistModalProps) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [privacyStatus, setPrivacyStatus] = useState('private')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const createPlaylistMutation = useMutation<Playlist, Error, {
    title: string
    description: string
    privacyStatus: string
  }>({
    mutationFn: async ({ title, description, privacyStatus }) => {
      if (!token) {
        throw new Error('Missing access token. Please sign in again.')
      }

      const response = await fetch(
        'https://www.googleapis.com/youtube/v3/playlists?part=snippet,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
            },
            status: {
              privacyStatus,
            },
          }),
        },
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.error?.message ?? 'Failed to create playlist.'
        throw new Error(message)
      }

      return (await response.json()) as Playlist
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['playlists', channelId, token] })
      setIsOpen(false)
    },
  })

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTitle('')
      setDescription('')
      setPrivacyStatus('private')
      setErrorMessage(null)
    }
    setIsOpen(open)
  }

  const handleCreate = async () => {
    setErrorMessage(null)

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage('Playlist title is required.')
      return
    }

    try {
      await createPlaylistMutation.mutateAsync({
        title: trimmedTitle,
        description: description.trim(),
        privacyStatus,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create playlist.'
      setErrorMessage(message)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button
        variant="outline"
        className="border-slate-700 text-slate-800 hover:bg-slate-800 hover:text-slate-100"
        onClick={() => handleOpenChange(true)}
        disabled={!token}
      >
        New playlist
      </Button>

      <DialogContent className="border-slate-800 bg-slate-900 text-slate-50">
        <DialogHeader>
          <DialogTitle>Create playlist</DialogTitle>
          <DialogDescription className="text-slate-400">
            Add a new playlist to your YouTube channel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-playlist-title">Title</Label>
            <Input
              id="new-playlist-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="My favorite tracks"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-playlist-description">Description (optional)</Label>
            <Textarea
              id="new-playlist-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Short description for the playlist"
              className="min-h-[110px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-playlist-privacy">Privacy</Label>
            <select
              id="new-playlist-privacy"
              value={privacyStatus}
              onChange={(event) => setPrivacyStatus(event.target.value)}
              className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 shadow-xs focus-visible:border-slate-400 focus-visible:outline-none"
            >
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="public">Public</option>
            </select>
          </div>

          {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="border-slate-700 text-slate-800 hover:bg-slate-800 hover:text-slate-100"
            onClick={() => setIsOpen(false)}
            disabled={createPlaylistMutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={createPlaylistMutation.isPending}>
            {createPlaylistMutation.isPending ? 'Creating...' : 'Create playlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
