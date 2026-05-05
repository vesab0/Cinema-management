import { useEffect, useState } from "react";
import { moviesApi } from "../api";
import type { MovieRow } from "../types";
import MovieCard from "../components/MovieCard";
import SecondaryNav from "../components/SecondaryNav";

export default function MoviesPage() {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    moviesApi
      .list()
      .then((data: MovieRow[]) => setMovies(data))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

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
            Now Playing
          </h1>
          <div className="w-12 h-0.5 bg-wine mb-10" />
          {loading && (
            <p className="text-white/50 text-sm tracking-wide">Loading movies...</p>
          )}
          {error && (
            <p className="text-red-400 text-sm">Error: {error}</p>
          )}
          {!loading && !error && movies.length === 0 && (
            <p className="text-white/50 text-sm tracking-wide">No movies available at the moment.</p>
          )}
          <div className="flex flex-wrap gap-8">
            {movies
              .filter((m) => m.isActive)
              .map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}