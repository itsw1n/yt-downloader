import api from '@/lib/axios'
import type { VideoInfo } from '@/features/downloader/types'

export const downloaderApi = {
  getVideoInfo: async (url: string): Promise<VideoInfo> => {
    const { data } = await api.get<VideoInfo>('/api/info', { params: { url } })
    return data
  },
}
