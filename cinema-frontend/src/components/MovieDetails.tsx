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
    <div className="max-w-5xl mx-auto p-6 flex flex-col md:flex-row gap-10 items-start">
      <div className="w-full md:w-1/3">
        <div className="bg-gray-100 rounded overflow-hidden shadow">
          <img src={posterSrc} alt={movie.name} className="w-full h-auto block" />
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-widest text-white/40 mb-1">So you want to watch:</p>
        <h1 className="text-3xl text-white font-bold">{movie.name}</h1>
        <div className="text-sm text-gray-500 mt-2">
          {movie.ageRating} • {movie.durationMinutes} min • {movie.releaseDate?.split('T')[0]}
        </div>
        <p className="mt-4 text-base text-white whitespace-pre-line">{movie.description}</p>
        <div className="mt-4 text-gray-500 text-sm">
          <strong>Director:</strong> {movie.director}
        </div>
        <div className="mt-2 text-gray-500 text-sm">
          <strong>Cast:</strong> {movie.cast?.map((c) => c.fullName).join(', ')}
        </div>
        <div className="mt-2 text-gray-500 text-sm">
          <strong>Genres:</strong> {movie.genres?.join(', ')}
        </div>
     
      </div>
    </div>
  )
}