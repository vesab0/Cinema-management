import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { MovieRow } from '../types'
import { moviesApi } from '../api'
import MovieTrailer from './MovieTrailer'

type Props = {
  movieId?: string
}

export default function MovieDetails({ movieId: propId }: Props) {
  const params = useParams()
  const id = propId ?? (params as any)?.id
  const [movie, setMovie] = useState<MovieRow | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    moviesApi
      .getById(id)
      .then((m) => setMovie(m))
      .catch(() => setMovie(null))
      .finally(() => setLoading(false))
  }, [id])

  if (!id) return <div className="p-6">No movie selected.</div>
  if (loading) return <div className="p-6">Loading...</div>
  if (!movie) return <div className="p-6">Movie not found.</div>

  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
  const posterPath = movie.posterUrl ?? ''
  const posterSrc = posterPath.startsWith('http')
    ? posterPath
    : `${apiBase.replace(/\/$/, '')}/${posterPath.replace(/^\//, '')}`

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row gap-10 items-start">
      <div className="w-full md:w-[280px] shrink-0">
        <div className="rounded overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
          <img src={posterSrc} alt={movie.name} className="w-full h-auto block" />
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/35 mb-3">Now Showing</p>
        <h1 className="text-4xl font-bold uppercase tracking-wide text-white leading-tight">{movie.name}</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {movie.ageRating && (
            <span className="text-[11px] uppercase tracking-wide border border-white/20 text-white/50 px-2 py-0.5 rounded-sm">
              {movie.ageRating}
            </span>
          )}
          {movie.durationMinutes && (
            <span className="text-[11px] uppercase tracking-wide text-white/40">{movie.durationMinutes} min</span>
          )}
          {movie.releaseDate && (
            <span className="text-[11px] uppercase tracking-wide text-white/40">{movie.releaseDate.split('T')[0]}</span>
          )}
        </div>
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {movie.genres.map((g) => (
              <span key={g} className="text-[10px] uppercase tracking-wide bg-wine/60 text-white/60 px-2 py-0.5 rounded-sm">
                {g}
              </span>
            ))}
          </div>
        )}
        <p className="mt-5 text-sm text-white/65 leading-relaxed">{movie.description}</p>
        <div className="mt-6 space-y-3 border-t border-white/8 pt-5">
          {movie.director && (
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-0.5">Director</span>
              <span className="text-sm text-white/70">{movie.director}</span>
            </div>
          )}
          {movie.cast && movie.cast.length > 0 && (
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-0.5">Cast</span>
              <span className="text-sm text-white/70">{movie.cast.map((c) => c.fullName).join(', ')}</span>
            </div>
          )}
        </div>
        <div className="mt-6">
          <MovieTrailer trailerUrl={movie.trailerUrl} />
        </div>
      </div>
    </div>
  )
}