import { useEffect, useState } from "react";
import { moviesApi } from "../api";
import type { MovieRow } from "../types";
import MovieCard from "../components/MovieCard";
import SecondaryNav from "../components/SecondaryNav";

interface MoviesPageProps {
  mode?: "now-playing" | "upcoming";
}

export default function MoviesPage({ mode = "now-playing" }: MoviesPageProps) {
  const [movies, setMovies] = useState<MovieRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    moviesApi
      .list()
      .then((data: MovieRow[]) => setMovies(data))
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
            {filtered.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
