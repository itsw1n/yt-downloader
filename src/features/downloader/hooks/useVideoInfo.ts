import { useQuery } from '@tanstack/react-query'
import { downloaderApi } from '@/features/downloader/api/downloaderApi'

export function useVideoInfo(url: string | null) {
  return useQuery({
    queryKey: ['videoInfo', url],
    queryFn: () => downloaderApi.getVideoInfo(url as string),
    enabled: Boolean(url),
  })
}
