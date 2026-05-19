import { useEffect, useRef, useState } from "react";
import { movieSearchApi, favoritesApi } from "../api";
import type { PredictorMovie } from "../types";
import SecondaryNav from "../components/SecondaryNav";
import { getUserId } from "../auth";

export default function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PredictorMovie[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = getUserId();

  useEffect(() => {
    if (!userId) return;
    favoritesApi.list(userId).then((favs) => {
      setFavorites(new Set(favs.map((f) => f.tmdbId)));
    }).catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      movieSearchApi.search(query.trim())
        .then(setResults)
        .catch(() => setError("Search failed. Is the predictor running?"))
        .finally(() => setLoading(false));
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleToggleFavorite = async (movie: PredictorMovie) => {
    if (!userId) return;

    if (favorites.has(movie.tmdbId)) {
      setFavorites((prev) => { const next = new Set(prev); next.delete(movie.tmdbId); return next; });
      await favoritesApi.remove(userId, movie.tmdbId).catch(() => {
        setFavorites((prev) => new Set([...prev, movie.tmdbId]));
      });
    } else {
      setFavorites((prev) => new Set([...prev, movie.tmdbId]));
      await favoritesApi.add(userId, movie.tmdbId, movie.title, movie.posterUrl).catch(() => {
        setFavorites((prev) => { const next = new Set(prev); next.delete(movie.tmdbId); return next; });
      });
    }
  };

  return (
    <div
      className="min-h-screen w-full relative"
      style={{
        backgroundImage: "url('/hero.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10">
        <SecondaryNav />
        <div className="px-10 py-10 max-w-6xl mx-auto">
          <h1 className="font-display text-gold text-5xl tracking-widest uppercase mb-2">
            Discover
          </h1>
          <div className="w-12 h-0.5 bg-wine mb-6" />

          <input
            type="text"
            placeholder="Search any movie..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="mb-8 w-full max-w-md px-4 py-2.5 rounded bg-black/40 border border-gold/30 text-white placeholder-white/40 focus:outline-none focus:border-gold/60"
          />

          {loading && (
            <p className="text-white/50 text-sm tracking-wide mb-6">Searching...</p>
          )}
          {error && (
            <p className="text-red-400 text-sm mb-6">{error}</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && !error && (
            <p className="text-white/50 text-sm tracking-wide mb-6">No results for "{query}"</p>
          )}

          <div className="flex flex-wrap gap-8">
            {results.map((movie) => {
              const isFav = favorites.has(movie.tmdbId);
              return (
                <div key={movie.tmdbId} className="w-[200px]">
                  <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-[#1a1a1a] relative group">
                    {movie.posterUrl ? (
                      <img
                        src={movie.posterUrl}
                        alt={movie.title}
                        className="w-full h-full object-cover block transition-transform duration-200 hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-3">
                        <span className="text-[#666] text-xs text-center">{movie.title}</span>
                      </div>
                    )}
                    {userId && (
                      <button
                        onClick={() => handleToggleFavorite(movie)}
                        className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity ${isFav ? 'text-red-500' : 'text-white/70 hover:text-red-400'}`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFav ? '♥' : '♡'}
                      </button>
                    )}
                  </div>
                  <div className="text-[13px] font-medium text-white mb-1 uppercase tracking-wide truncate" title={movie.title}>
                    {movie.title}
                  </div>
                  <div className="text-xs text-[#888] flex items-center gap-2">
                    <span>{movie.releaseDate?.split("-")[0] ?? "—"}</span>
                    {movie.voteAverage > 0 && (
                      <span className="text-gold/70">★ {movie.voteAverage.toFixed(1)}</span>
                    )}
                  </div>
                  {movie.genres.length > 0 && (
                    <div className="text-[10px] text-white/40 mt-0.5 truncate">
                      {movie.genres.slice(0, 3).join(" · ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!userId && results.length > 0 && (
            <p className="mt-8 text-white/40 text-xs tracking-wide">
              Sign in to save favorites.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
