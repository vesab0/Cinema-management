import { useEffect, useState } from "react";
import { moviesApi, favoritesApi } from "../api";
import type { MovieRow } from "../types";
import MovieCard from "../components/MovieCard";
import SecondaryNav from "../components/SecondaryNav";
import { getUserId } from "../auth";

interface MoviesPageProps {
  mode?: "now-playing" | "upcoming";
}

export default function MoviesPage({ mode = "now-playing" }: MoviesPageProps) {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = getUserId();

  useEffect(() => {
    moviesApi
      .list()
      .then((data: MovieRow[]) => setMovies(data))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!userId) return;
    favoritesApi.list(userId).then((favs) => {
      setFavorites(new Set(favs.map((f) => f.tmdbId)));
    }).catch(() => {});
  }, [userId]);

  const handleToggleFavorite = async (movie: MovieRow) => {
    if (!userId || movie.tmdbId == null) return;
    const tmdbId = movie.tmdbId;

    if (favorites.has(tmdbId)) {
      setFavorites((prev) => { const next = new Set(prev); next.delete(tmdbId); return next; });
      await favoritesApi.remove(userId, tmdbId).catch(() => {
        setFavorites((prev) => new Set([...prev, tmdbId]));
      });
    } else {
      setFavorites((prev) => new Set([...prev, tmdbId]));
      await favoritesApi.add(userId, tmdbId, movie.name, movie.posterUrl ?? '').catch(() => {
        setFavorites((prev) => { const next = new Set(prev); next.delete(tmdbId); return next; });
      });
    }
  };

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const filtered = movies
    .filter((m) => m.isActive)
    .filter((m) => {
      const releaseStr = m.releaseDate ? m.releaseDate.slice(0, 10) : null;
      if (mode === "upcoming") return releaseStr !== null && releaseStr > todayStr;
      return releaseStr === null || releaseStr <= todayStr;
    })
    .filter((m) =>
      search.trim() === "" || m.name.toLowerCase().includes(search.toLowerCase())
    );

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
        <div className="px-4 sm:px-8 md:px-10 py-10 max-w-6xl mx-auto">
          <h1 className="font-display text-gold text-3xl sm:text-5xl tracking-widest uppercase mb-2">
            {mode === "upcoming" ? "Upcoming" : "Now Playing"}
          </h1>
          <div className="w-12 h-0.5 bg-wine mb-6" />

          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full max-w-sm px-4 py-2.5 rounded bg-black/40 border border-gold/30 text-white placeholder-white/40 focus:outline-none focus:border-gold/60 transition-colors"
          />

          {loading && (
            <p className="text-white/50 text-sm tracking-wide">Loading movies...</p>
          )}
          {error && (
            <p className="text-red-400 text-sm">Error: {error}</p>
          )}
          {!loading && !error && filtered.length === 0 && (
            <p className="text-white/50 text-sm tracking-wide">No movies found.</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {filtered.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                isFavorite={movie.tmdbId != null && favorites.has(movie.tmdbId)}
                onToggleFavorite={userId ? handleToggleFavorite : undefined}
              />
            ))}
          </div>

          {!userId && movies.length > 0 && (
            <p className="mt-8 text-white/40 text-xs tracking-wide">
              Sign in to save your favorite movies.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
