import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { favoritesApi, movieSearchApi, userTicketsApi } from "../api";
import type { FavoriteMovieResponse, PredictorMovie, UserTicketRow } from "../types";
import SecondaryNav from "../components/SecondaryNav";
import { getUserId, getUserName, getUserEmail } from "../auth";

// Strip embedded quotes from malformed TMDB URLs stored before the predictor fix
function cleanUrl(url: string): string {
  return url.replace(/'/g, "").replace(/"/g, "");
}

export default function ProfilePage() {
  const userId = getUserId();
  const userName = getUserName();
  const userEmail = getUserEmail();

  // Tickets state
  const [tickets, setTickets] = useState<UserTicketRow[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteMovieResponse[]>([]);
  const [favsLoading, setFavsLoading] = useState(true);
  const [favsError, setFavsError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search state (inside modal)
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PredictorMovie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const favoriteTmdbIds = new Set(favorites.map((f) => f.tmdbId));

  useEffect(() => {
    if (!userId) { setFavsLoading(false); setTicketsLoading(false); return; }
    favoritesApi.list(userId)
      .then(setFavorites)
      .catch((e: unknown) => setFavsError(String(e)))
      .finally(() => setFavsLoading(false));
    userTicketsApi.list()
      .then((all) => {
        const now = Date.now()
        const active = all.filter((t) => {
          if (t.userId !== userId) return false
          const day = t.scheduleDay?.split('T')[0] ?? ''
          const [hh, mm] = (t.startTime ?? '00:00').split(':').map(Number)
          const start = new Date(day)
          start.setHours(hh, mm, 0, 0)
          const end = new Date(start.getTime() + (t.durationMinutes ?? 0) * 60_000)
          return end.getTime() > now
        })
        setTickets(active)
      })
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }, [userId]);

  // Search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      movieSearchApi.search(query.trim())
        .then(setResults)
        .catch(() => setSearchError("Search failed. Is the predictor running?"))
        .finally(() => setSearchLoading(false));
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleRemoveFavorite = async (tmdbId: number) => {
    if (!userId) return;
    setFavorites((prev) => prev.filter((f) => f.tmdbId !== tmdbId));
    await favoritesApi.remove(userId, tmdbId).catch(() => {
      favoritesApi.list(userId).then(setFavorites).catch(() => {});
    });
  };

  const handleToggleFavorite = async (movie: PredictorMovie) => {
    if (!userId) return;

    if (favoriteTmdbIds.has(movie.tmdbId)) {
      setFavorites((prev) => prev.filter((f) => f.tmdbId !== movie.tmdbId));
      await favoritesApi.remove(userId, movie.tmdbId).catch(() => {
        favoritesApi.list(userId).then(setFavorites).catch(() => {});
      });
    } else {
      await favoritesApi.add(userId, movie.tmdbId, movie.title, movie.posterUrl)
        .then((newFav) => {
          setFavorites((prev) => [...prev, newFav]);
        })
        .catch(() => {});
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setQuery("");
    setResults([]);
    setSearchError(null);
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

          {/* User info section */}
          <h1 className="font-display text-gold text-5xl tracking-widest uppercase mb-2">
            Profile
          </h1>
          <div className="w-12 h-0.5 bg-wine mb-6" />

          {!userId ? (
            <p className="text-white/60 text-sm mb-10">
              Please{" "}
              <Link to="/register" className="text-gold underline">
                sign in
              </Link>{" "}
              to view your profile.
            </p>
          ) : (
            <div className="mb-10">
              {userName && (
                <p className="text-white text-2xl font-semibold mb-1">{userName}</p>
              )}
              {userEmail && (
                <p className="text-white/60 text-sm">{userEmail}</p>
              )}
            </div>
          )}

          {/* My Tickets section */}
          {userId && (
            <div className="mb-12">
              <h2 className="text-white text-xl uppercase tracking-widest font-semibold mb-6">
                My Tickets
              </h2>
              {ticketsLoading && (
                <p className="text-white/50 text-sm tracking-wide">Loading...</p>
              )}
              {!ticketsLoading && tickets.length === 0 && (
                <p className="text-white/50 text-sm tracking-wide">No tickets yet.</p>
              )}
              <div className="flex flex-wrap gap-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-[#141414] border border-white/10 rounded p-5 w-[280px] flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-[#f5c518] text-sm leading-snug">{t.movieName}</p>
                        <p className="text-white/50 text-xs mt-0.5">{t.roomName}</p>
                      </div>
                      {t.isUsed && (
                        <span className="text-[10px] uppercase tracking-widest text-white/30 bg-white/5 border border-white/10 rounded px-2 py-0.5 shrink-0">Used</span>
                      )}
                    </div>

                    <div className="border-t border-white/10" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-sm bg-white/10 text-xs font-bold flex items-center justify-center text-white/70">
                          {t.rowLabel}{t.colNumber}
                        </span>
                        <span className="text-sm text-white/60">
                          {t.seatType !== 'Standard'
                            ? <span className="text-[#f5c518]/80">{t.seatType}</span>
                            : 'Standard'}
                        </span>
                      </div>
                      <span className="font-bold text-white/80">${t.price.toFixed(2)}</span>
                    </div>

                    <p className="text-xs text-white/40">
                      {t.scheduleDay?.split('T')[0]} · {t.startTime}
                    </p>

                    <div className="border-t border-white/10" />

                    <p className="text-[10px] font-mono text-white/30 tracking-widest">
                      #{t.confirmationCode}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My Favorites section */}
          {userId && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl uppercase tracking-widest font-semibold">
                  My Favorites
                </h2>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-xs uppercase tracking-widest text-stage bg-gold rounded hover:bg-gold/90 transition-colors font-medium"
                >
                  + Add Favorites
                </button>
              </div>

              {favsLoading && (
                <p className="text-white/50 text-sm tracking-wide">Loading...</p>
              )}
              {favsError && (
                <p className="text-red-400 text-sm">Error: {favsError}</p>
              )}
              {!favsLoading && !favsError && favorites.length === 0 && (
                <p className="text-white/50 text-sm tracking-wide">
                  No favorites yet. Click "Add Favorites" to search and save movies.
                </p>
              )}

              <div className="flex flex-wrap gap-8">
                {favorites.map((fav) => (
                  <div key={fav.favoriteId} className="w-[240px]">
                    <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-[#1a1a1a] relative group">
                      {fav.posterPath ? (
                        <>
                          <img
                            src={cleanUrl(fav.posterPath.startsWith("http") ? fav.posterPath : `http://localhost:5000${fav.posterPath}`)}
                            alt={fav.movieTitle}
                            className="w-full h-full object-cover block transition-transform duration-200 hover:scale-[1.04]"
                            onError={(e) => { const t = e.currentTarget; t.style.display = "none"; t.nextElementSibling?.classList.remove("hidden"); }}
                          />
                          <div className="hidden w-full h-full flex items-center justify-center p-3">
                            <span className="text-[#666] text-xs text-center">{fav.movieTitle}</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3">
                          <span className="text-[#666] text-xs text-center">{fav.movieTitle}</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleRemoveFavorite(fav.tmdbId)}
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
            </>
          )}
        </div>
      </div>

      {/* Add Favorites Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-6 pt-16 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-stage rounded-lg border border-gold/30 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gold/20">
              <h2 className="text-gold text-lg uppercase tracking-widest font-semibold">
                Add Favorites
              </h2>
              <button
                onClick={closeModal}
                className="text-white/60 hover:text-white text-2xl leading-none font-light"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5">
              <input
                type="text"
                placeholder="Search any movie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
                className="mb-6 w-full max-w-md px-4 py-2.5 rounded bg-black/40 border border-gold/30 text-white placeholder-white/40 focus:outline-none focus:border-gold/60"
              />

              {searchLoading && (
                <p className="text-white/50 text-sm tracking-wide mb-4">Searching...</p>
              )}
              {searchError && (
                <p className="text-red-400 text-sm mb-4">{searchError}</p>
              )}
              {!searchLoading && query.trim().length >= 2 && results.length === 0 && !searchError && (
                <p className="text-white/50 text-sm tracking-wide mb-4">No results for "{query}"</p>
              )}

              <div className="flex flex-wrap gap-6 pb-2">
                {results.map((movie) => {
                  const isFav = favoriteTmdbIds.has(movie.tmdbId);
                  return (
                    <div key={movie.tmdbId} className="w-[160px]">
                      <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-2 bg-[#1a1a1a] relative group">
                        {movie.posterUrl ? (
                          <>
                            <img
                              src={cleanUrl(movie.posterUrl)}
                              alt={movie.title}
                              className="w-full h-full object-cover block transition-transform duration-200 hover:scale-[1.04]"
                              onError={(e) => { const t = e.currentTarget; t.style.display = "none"; t.nextElementSibling?.classList.remove("hidden"); }}
                            />
                            <div className="hidden w-full h-full flex items-center justify-center p-3">
                              <span className="text-[#666] text-xs text-center">{movie.title}</span>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3">
                            <span className="text-[#666] text-xs text-center">{movie.title}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleToggleFavorite(movie)}
                          className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity ${isFav ? "text-red-500" : "text-white/70 hover:text-red-400"}`}
                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          {isFav ? "♥" : "♡"}
                        </button>
                      </div>
                      <div className="text-[12px] font-medium text-white mb-0.5 uppercase tracking-wide truncate" title={movie.title}>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
