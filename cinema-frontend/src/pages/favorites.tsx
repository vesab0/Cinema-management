import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { favoritesApi } from "../api";
import type { FavoriteMovieResponse } from "../types";
import SecondaryNav from "../components/SecondaryNav";
import { getUserId } from "../auth";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteMovieResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = getUserId();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    favoritesApi.list(userId)
      .then(setFavorites)
      .catch((e: unknown) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleRemove = async (tmdbId: number) => {
    if (!userId) return;
    setFavorites((prev) => prev.filter((f) => f.tmdbId !== tmdbId));
    await favoritesApi.remove(userId, tmdbId).catch(() => {
      favoritesApi.list(userId).then(setFavorites).catch(() => {});
    });
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
            My Favorites
          </h1>
          <div className="w-12 h-0.5 bg-wine mb-10" />

          {!userId && (
            <p className="text-white/60 text-sm">
              Please{" "}
              <Link to="/register" className="text-gold underline">
                sign in
              </Link>{" "}
              to view your favorites.
            </p>
          )}

          {userId && loading && (
            <p className="text-white/50 text-sm tracking-wide">Loading...</p>
          )}
          {userId && error && (
            <p className="text-red-400 text-sm">Error: {error}</p>
          )}
          {userId && !loading && !error && favorites.length === 0 && (
            <p className="text-white/50 text-sm tracking-wide">
              No favorites yet.{" "}
              <Link to="/movies" className="text-gold underline">
                Browse movies
              </Link>
            </p>
          )}

          <div className="flex flex-wrap gap-8">
            {favorites.map((fav) => (
              <div key={fav.favoriteId} className="w-[240px]">
                <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-[#1a1a1a] relative group">
                  {fav.posterPath ? (
                    <img
                      src={fav.posterPath.startsWith("http") ? fav.posterPath : `http://localhost:5000${fav.posterPath}`}
                      alt={fav.movieTitle}
                      className="w-full h-full object-cover block transition-transform duration-200 hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-3">
                      <span className="text-[#666] text-xs text-center">{fav.movieTitle}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleRemove(fav.tmdbId)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-red-500 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                    title="Remove from favorites"
                  >
                    ♥
                  </button>
                </div>
                <div className="text-[13px] font-medium text-white mb-1 uppercase tracking-wide">
                  {fav.movieTitle}
                </div>
                <div className="text-xs text-[#888]">
                  Added: {fav.addedAt ? String(fav.addedAt).split("T")[0] : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
