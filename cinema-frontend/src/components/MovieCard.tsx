import type { MovieRow } from '../types'

type Props = {
  movie: MovieRow
  isFavorite?: boolean
  onToggleFavorite?: (movie: MovieRow) => void
}

export default function MovieCard({ movie, isFavorite = false, onToggleFavorite }: Props) {
  return (
    <div className="w-[240px] cursor-pointer">
      <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-[#1a1a1a] relative group">
        {movie.posterUrl ? (
          <img
            src={`http://localhost:5000${movie.posterUrl}`}
            alt={movie.name}
            className="w-full h-full object-cover block transition-transform duration-200 hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-3">
            <span className="text-[#666] text-xs text-center">{movie.name}</span>
          </div>
        )}
        {onToggleFavorite && movie.tmdbId != null && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(movie) }}
            className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity ${isFavorite ? 'text-red-500' : 'text-white/70 hover:text-red-400'}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        )}
      </div>
      <div className="text-[13px] font-medium text-white mb-1 uppercase tracking-wide">
        {movie.name}
      </div>
      <div className="text-xs text-[#888]">
        {movie.releaseDate ? String(movie.releaseDate).split("T")[0] : "—"}
      </div>
    </div>
  );
}
