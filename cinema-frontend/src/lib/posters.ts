const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

type ResolvePosterUrlParams = {
  posterUrl?: string | null
  posterPath?: string | null
  tmdbSize?: 'w185' | 'w342' | 'w500' | 'w780' | 'original'
}

function sanitize(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/['"]/g, '')
}

function isAbsoluteUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:') || value.startsWith('data:')
}

function isTmdbUrl(value: string): boolean {
  return value.startsWith('https://image.tmdb.org/') || value.startsWith('http://image.tmdb.org/')
}

function isBackendLikePath(value: string): boolean {
  return value.startsWith('/uploads/') || value.startsWith('/posters/') || value.startsWith('/profile-pictures/')
}

function isLikelyTmdbPath(value: string): boolean {
  // TMDB poster paths are file-like paths (e.g. /abc123.jpg)
  return /\.(jpg|jpeg|png|webp)$/i.test(value)
}

function toTmdbUrl(path: string, size: ResolvePosterUrlParams['tmdbSize']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${TMDB_IMAGE_BASE}/${size ?? 'w500'}${normalizedPath}`
}

function extractTmdbPath(value: string): string {
  const marker = '/t/p/'
  const markerIndex = value.indexOf(marker)
  if (markerIndex === -1) return ''
  const pathStart = value.indexOf('/', markerIndex + marker.length)
  if (pathStart === -1) return ''
  return value.slice(pathStart)
}

export function resolvePosterUrl({
  posterUrl,
  posterPath,
  tmdbSize = 'w500',
}: ResolvePosterUrlParams): string {
  const cleanPosterUrl = sanitize(posterUrl)
  const cleanPosterPath = sanitize(posterPath)
  const candidate = cleanPosterUrl || cleanPosterPath

  if (!candidate) return ''

  if (isBackendLikePath(candidate)) return ''

  if (isAbsoluteUrl(candidate)) {
    if (isTmdbUrl(candidate)) return candidate
    const extractedTmdbPath = extractTmdbPath(candidate)
    return extractedTmdbPath ? toTmdbUrl(extractedTmdbPath, tmdbSize) : ''
  }

  if (candidate.startsWith('/t/p/')) {
    const extractedTmdbPath = extractTmdbPath(candidate)
    return extractedTmdbPath ? toTmdbUrl(extractedTmdbPath, tmdbSize) : ''
  }

  if (!isLikelyTmdbPath(candidate)) return ''

  return toTmdbUrl(candidate, tmdbSize)
}
