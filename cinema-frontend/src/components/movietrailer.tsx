import YouTube from 'react-youtube'

type Props = {
  trailerUrl?: string
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    return u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null
  } catch {
    return null
  }
}

export default function MovieTrailer({ trailerUrl }: Props) {
  if (!trailerUrl) return null
  const videoId = getYouTubeId(trailerUrl)
  if (!videoId) return null

  return (
    <div className="aspect-video w-full">
      <YouTube
        videoId={videoId}
        className="h-full w-full"
        iframeClassName="h-full w-full"
        opts={{
          playerVars: {
            autoplay: 1,
            mute: 1,
            rel: 0,
            playsinline: 1,
          },
        }}
      />
    </div>
  )
}