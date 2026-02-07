export type Playlist = {
  id: string
  snippet: {
    title: string
    description: string
    thumbnails?: {
      default?: {
        url: string
      }
    }
  }
  contentDetails: {
    itemCount: number
  }
}
