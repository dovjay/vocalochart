import { createChartSyncHandler } from './services/chart-sync-base.js'

const BASE_URL = 'https://vocaloard.injpok.tokyo/en/?k=3&p=2&s=3&t=1&v=teto'
const PAGE_SIZE = 1
const MAX_VIDEOS = 30
const TETO_PLAYLIST_ID = 'PLHLsghrbTm7U__UfVMJtI2DMg3SzPj41Q'

export default createChartSyncHandler({
  baseUrl: BASE_URL,
  playlistId: TETO_PLAYLIST_ID,
  pageSize: PAGE_SIZE,
  maxVideos: MAX_VIDEOS,
})
