import { Link } from 'react-router-dom'
import type { MovieRow } from '../types'

export default function MovieCard({ movie }: { movie: MovieRow }) {
  const apiBase = import.meta.env.VITE_API_URL ?? ''
  const posterPath = movie.posterUrl ?? ''
  const posterSrc = posterPath.startsWith('http') ? posterPath : (apiBase ? `${apiBase.replace(/\/$/, '')}/${posterPath.replace(/^\//, '')}` : posterPath)
  return (
    <Link to={`/movies/${movie.id}`} className="w-[240px] cursor-pointer block">
      <div>
        <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-[#1a1a1a] relative">
          {movie.posterUrl ? (
            <img
              src={posterSrc}
              alt={movie.name}
              className="w-full h-full object-cover block transition-transform duration-200 hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3">
              <span className="text-[#666] text-xs text-center">{movie.name}</span>
            </div>
          )}
        </div>
        <div className="text-[13px] font-medium text-white mb-1 uppercase tracking-wide">
          {movie.name}
        </div>
        <div className="text-xs text-[#888]">
          The movie screening starts at: {movie.releaseDate ? String(movie.releaseDate).split("T")[0] : "—"}
        </div>
      </div>
    </Link>
  )
}

