import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { favoritesApi, movieSearchApi, uploadsApi, usersApi, api, userTicketsApi } from "../api";
import type { FavoriteMovieResponse, PredictorMovie, UserTicketRow } from "../types";
import SecondaryNav from "../components/SecondaryNav";
import { getUserId, getUserName, getUserEmail, getUser, setUser } from "../auth";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

function cleanUrl(url: string): string {
  return url.replace(/'/g, "").replace(/"/g, "");
}

function resolveAvatar(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return `${API_BASE}${path}`;
}

export default function ProfilePage() {
  const userId = getUserId();
  const userEmail = getUserEmail();
  const currentUser = getUser();

  const [editFirstName, setEditFirstName] = useState(currentUser?.firstName ?? "");
  const [editLastName, setEditLastName] = useState(currentUser?.lastName ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    resolveAvatar(currentUser?.avatarPath)
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [editingName, setEditingName] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<UserTicketRow[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteMovieResponse[]>([]);
  const [favsLoading, setFavsLoading] = useState(true);
  const [favsError, setFavsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PredictorMovie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const favoriteTmdbIds = new Set(favorites.map((f) => f.tmdbId));

  // Derive display name from state
  const displayName = `${editFirstName} ${editLastName}`.trim() ||
    getUserName() || userEmail || "User";

  // Initials fallback
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

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

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setSaveError(null);
    setSavedOk(false);
    try {
      let avatarPath: string | undefined;
      if (selectedFile) {
        avatarPath = await uploadsApi.uploadImage(selectedFile);
      }
      await usersApi.updateProfile(userId, {
        firstName: editFirstName || undefined,
        lastName: editLastName || undefined,
        avatarPath: avatarPath || undefined,
      });
      const { data } = await api.get("/auth/me");
      setUser(data);
      setAvatarPreview(resolveAvatar(data?.avatarPath));
      setSelectedFile(null);
      setEditingName(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2500);
    } catch (e: unknown) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

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
        .then((newFav) => setFavorites((prev) => [...prev, newFav]))
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

        <div className="px-10 py-10 max-w-5xl mx-auto">

          {/* Page title */}
          <h1 className="font-display text-gold text-5xl tracking-widest uppercase mb-2">
            Profile
          </h1>
          <div className="w-12 h-0.5 bg-wine mb-8" />

          {!userId ? (
            <p className="text-white/60 text-sm">
              Please{" "}
              <Link to="/register" className="text-gold underline">
                sign in
              </Link>{" "}
              to view your profile.
            </p>
          ) : (
            <>
              {/* ── Profile row ───────────────────────────────────────── */}
              <div className="flex items-center gap-6 mb-10">

                {/* Avatar */}
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setSelectedFile(f);
                    if (f) setAvatarPreview(URL.createObjectURL(f));
                  }}
                />
                <div
                  className="relative h-20 w-20 rounded-full overflow-hidden bg-wine/60 border-2 border-gold/30 cursor-pointer shrink-0 group"
                  onClick={() => document.getElementById("avatar-file-input")?.click()}
                  title="Change profile photo"
                >
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gold text-xl font-bold">
                      {initials}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  {editingName ? (
                    <div className="flex gap-2 items-center mb-1">
                      <input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="First name"
                        className="px-3 py-1.5 rounded bg-black/40 border border-gold/30 text-white text-lg w-32 focus:outline-none focus:border-gold/60"
                      />
                      <input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Last name"
                        className="px-3 py-1.5 rounded bg-black/40 border border-gold/30 text-white text-lg w-32 focus:outline-none focus:border-gold/60"
                      />
                    </div>
                  ) : (
                    <div className="text-white text-2xl font-semibold mb-0.5 truncate">
                      {displayName}
                    </div>
                  )}
                  <div className="text-white/50 text-sm">{userEmail}</div>
                </div>

                {/* Actions — all on the same line */}
                <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => setEditingName((v) => !v)}
                  className="text-gold/60 hover:text-gold transition-colors"
                  title={editingName ? "Cancel" : "Edit name"}>
                  {editingName ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                </button>

              {(editingName || selectedFile) && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-5 bg-gold text-stage text-sm font-semibold rounded hover:bg-gold/90 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              )}

                  {savedOk && (
                    <span className="text-green-400 text-sm font-medium">Saved ✓</span>
                  )}
                  {saveError && (
                    <span className="text-red-400 text-sm">{saveError}</span>
                  )}
                </div>
              </div>

              {/* ── Favorites ─────────────────────────────────────────── */}
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

              {favsLoading && <p className="text-white/50 text-sm">Loading…</p>}
              {favsError && <p className="text-red-400 text-sm">Error: {favsError}</p>}
              {!favsLoading && !favsError && favorites.length === 0 && (
                <p className="text-white/50 text-sm tracking-wide">
                  No favorites yet. Click "Add Favorites" to search and save movies.
                </p>
              )}

              <div className="flex flex-wrap gap-8">
                {favorites.map((fav) => (
                  <div key={fav.favoriteId} className="w-[180px]">
                    <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-3 bg-black/40 relative group">
                      {fav.posterPath ? (
                        <img
                          src={cleanUrl(
                            fav.posterPath.startsWith("http")
                              ? fav.posterPath
                              : `${API_BASE}${fav.posterPath}`
                          )}
                          alt={fav.movieTitle}
                          className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.04]"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3">
                          <span className="text-white/30 text-xs text-center">{fav.movieTitle}</span>
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
                    <div className="text-[13px] font-medium text-white uppercase tracking-wide truncate">
                      {fav.movieTitle}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {fav.addedAt ? String(fav.addedAt).split("T")[0] : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add Favorites Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-6 pt-16 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="relative w-full max-w-3xl bg-stage rounded-lg border border-gold/30 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gold/20">
              <h2 className="text-gold text-lg uppercase tracking-widest font-semibold">
                Add Favorites
              </h2>
              <button
                onClick={closeModal}
                className="text-white/60 hover:text-white text-2xl leading-none"
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

              {searchLoading && <p className="text-white/50 text-sm mb-4">Searching…</p>}
              {searchError && <p className="text-red-400 text-sm mb-4">{searchError}</p>}
              {!searchLoading && query.trim().length >= 2 && results.length === 0 && !searchError && (
                <p className="text-white/50 text-sm mb-4">No results for "{query}"</p>
              )}

              <div className="flex flex-wrap gap-6 pb-2">
                {results.map((movie) => {
                  const isFav = favoriteTmdbIds.has(movie.tmdbId);
                  return (
                    <div key={movie.tmdbId} className="w-[140px]">
                      <div className="w-full aspect-[2/3] overflow-hidden rounded-md mb-2 bg-black/40 relative group">
                        {movie.posterUrl ? (
                          <img
                            src={cleanUrl(movie.posterUrl)}
                            alt={movie.title}
                            className="w-full h-full object-cover transition-transform duration-200 hover:scale-[1.04]"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-3">
                            <span className="text-white/30 text-xs text-center">{movie.title}</span>
                          </div>
                        )}
                        <button
                          onClick={() => handleToggleFavorite(movie)}
                          className={`absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity ${isFav ? "text-red-500" : "text-white/70 hover:text-red-400"}`}
                          title={isFav ? "Remove" : "Add to favorites"}
                        >
                          {isFav ? "♥" : "♡"}
                        </button>
                      </div>
                      <div className="text-[12px] font-medium text-white uppercase tracking-wide truncate" title={movie.title}>
                        {movie.title}
                      </div>
                      <div className="text-xs text-white/40 flex items-center gap-2 mt-0.5">
                        <span>{movie.releaseDate?.split("-")[0] ?? "—"}</span>
                        {movie.voteAverage > 0 && (
                          <span className="text-gold/70">★ {movie.voteAverage.toFixed(1)}</span>
                        )}
                      </div>
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