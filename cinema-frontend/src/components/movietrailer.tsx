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
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?mute=1&rel=0`}
        title="Movie trailer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  )
}