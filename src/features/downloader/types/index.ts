export interface Quality {
  height: number
  ext: string
  label: string
}

export interface VideoInfo {
  title: string
  thumbnail: string
  duration_string?: string
  uploader?: string
  view_count?: number
  qualities: Quality[]
  hasAudio: boolean
  id: string
}
