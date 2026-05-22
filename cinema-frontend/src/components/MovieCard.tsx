import { Link } from 'react-router-dom'
import type { MovieRow } from '../types'

type Props = {
  movie: MovieRow
  isFavorite?: boolean
  onToggleFavorite?: (movie: MovieRow) => void
}

export default function MovieCard({ movie, isFavorite = false, onToggleFavorite }: Props) {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const posterPath = movie.posterUrl ?? ''
  const posterSrc = posterPath.startsWith('http')
    ? posterPath
    : (apiBase ? `${apiBase.replace(/\/$/, '')}/${posterPath.replace(/^\//, '')}` : posterPath)

  return (
    <Link to={`/movies/${movie.id}`} className="w-[220px] sm:w-[240px] cursor-pointer block group/card">
      <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-[#1a1a1a] relative">
        {movie.posterUrl ? (
          <img
            src={posterSrc}
            alt={movie.name}
            className="w-full h-full object-cover block transition-transform duration-300 group-hover/card:scale-[1.05]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3">
            <span className="text-[#666] text-xs text-center">{movie.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {onToggleFavorite && movie.tmdbId != null && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(movie) }}
            className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-lg leading-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 ${isFavorite ? 'text-red-500' : 'text-white/70 hover:text-red-400'}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        )}
      </div>
      <div className="text-[13px] font-medium text-white mb-1 uppercase tracking-wide transition-colors group-hover/card:text-gold">
        {movie.name}
      </div>
      <div className="text-xs text-[#888]">
        {movie.releaseDate ? String(movie.releaseDate).split("T")[0] : "—"}
      </div>
    </Link>
  )
}