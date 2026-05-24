import { useEffect, useRef, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { castMembersApi, genresApi, moviesApi, uploadsApi } from "../../api";
import type { CastMemberOption, GenreOption, MovieRow } from "../../types";

const inputClass = "w-full text-sm text-white bg-dash-surface border border-dash-border rounded-lg px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all";

function SearchSelect({
  selectedIds,
  options,
  labelKey,
  onChangeIds,
  onCreateNew,
  placeholder,
}: {
  selectedIds: string[];
  options: { id: string; [key: string]: string }[];
  labelKey: string;
  onChangeIds: (ids: string[]) => void;
  onCreateNew: (name: string) => Promise<{ id: string }>;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(
    (o) =>
      !selectedIds.includes(o.id) &&
      o[labelKey].toLowerCase().includes(query.toLowerCase())
  );

  const selectedOptions = options.filter((o) => selectedIds.includes(o.id));

  const select = (id: string) => {
    onChangeIds([...selectedIds, id]);
    setQuery("");
    setOpen(false);
  };

  const remove = (id: string) => {
    onChangeIds(selectedIds.filter((x) => x !== id));
  };

  const exactMatch = options.some(
    (o) => o[labelKey].toLowerCase() === query.trim().toLowerCase()
  );
  const canCreate = query.trim().length > 0 && !exactMatch;

  const handleCreate = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setCreating(true);
    const created = await onCreateNew(trimmed);
    select(created.id);
    setCreating(false);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Selected chips */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-wine text-white"
            >
              {o[labelKey]}
              <button
                type="button"
                onClick={() => remove(o.id)}
                className="ml-0.5 hover:text-gray-300 leading-none text-base"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={inputClass}
        />

        {/* Dropdown */}
        {open && (query.length > 0 || filtered.length > 0) && (
          <div className="absolute z-50 mt-1 w-full bg-dash-card border border-dash-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 && !canCreate && (
              <div className="px-3 py-2 text-sm text-white/40">No results</div>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); select(o.id); }}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
              >
                {o[labelKey]}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                disabled={creating}
                className="w-full text-left px-3 py-2 text-sm text-gold hover:bg-gold/10 transition-colors border-t border-dash-border disabled:opacity-40"
              >
                {creating ? "Creating…" : `+ Create "${query.trim()}"`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Movies() {
  const [rows, setRows] = useState<MovieRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genreOptions, setGenreOptions] = useState<GenreOption[]>([]);
  const [castOptions, setCastOptions] = useState<CastMemberOption[]>([]);
  const [isPosterUploading, setIsPosterUploading] = useState(false);

  const loadData = async () => {
    const [movies, genres, cast] = await Promise.all([
      moviesApi.list(), genresApi.list(), castMembersApi.list(),
    ]);
    setRows(movies);
    setGenreOptions(genres);
    setCastOptions(cast);
  };

  useEffect(() => {
    loadData().catch((e) => setError(String(e))).finally(() => setLoading(false));
  }, []);

  const columns: Column<MovieRow>[] = [
    { key: "name",            label: "Name",           width: "180px" },
    { key: "description",     label: "Description",    hideInTable: true },
    { key: "director",        label: "Director",       width: "140px" },
    { key: "durationMinutes", label: "Duration (min)", width: "110px", type: "number" },
    { key: "ageRating",       label: "Age Rating",     width: "90px" },
    { key: "isActive",        label: "Active",         width: "80px", type: "select", options: ["true", "false"] },
    {
      key: "createdAt",
      label: "Created At",
      width: "110px",
      hideInModal: true,
      renderCell: (v) => <span className="text-sm text-white/80 px-1.5">{String(v).split("T")[0]}</span>,
    },
    {
      key: "releaseDate",
      label: "Release Date",
      width: "110px",
      renderCell: (v) => <span className="text-sm text-white/80 px-1.5">{String(v).split("T")[0]}</span>,
      renderField: (val, onChange) => (
        <input type="date" value={String(val ?? "").split("T")[0]} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ),
    },
    {
      key: "genres",
      label: "Genres",
      renderCell: (val) => (
        <span className="text-sm text-white/80 px-1.5">{(val as string[]).join(", ")}</span>
      ),
      renderField: (val, onChange) => {
        const selected = (val as string[]) ?? [];
        const ids = selected
          .map((name) => genreOptions.find((g) => g.name === name)?.id ?? "")
          .filter(Boolean);
        return (
          <SearchSelect
            selectedIds={ids}
            options={genreOptions as { id: string; [key: string]: string }[]}
            labelKey="name"
            onChangeIds={(newIds) => {
              const names = newIds
                .map((id) => genreOptions.find((g) => g.id === id)?.name ?? "")
                .filter(Boolean);
              onChange(names);
            }}
            onCreateNew={async (name) => {
              const genre = await genresApi.create(name);
              setGenreOptions((prev) => [...prev, genre]);
              return genre;
            }}
            placeholder="Search or create genre…"
          />
        );
      },
    },
    {
      key: "cast",
      label: "Cast",
      renderCell: (val) => (
        <span className="text-sm text-white/80 px-1.5">{(val as { fullName: string }[]).map((c) => c.fullName).join(", ")}</span>
      ),
      renderField: (val, onChange) => {
        const selected = (val as { fullName: string }[]) ?? [];
        const ids = selected
          .map((entry) => castOptions.find((c) => c.fullName === entry.fullName)?.id ?? "")
          .filter(Boolean);
        return (
          <SearchSelect
            selectedIds={ids}
            options={castOptions as { id: string; [key: string]: string }[]}
            labelKey="fullName"
            onChangeIds={(newIds) => {
              const cast = newIds
                .map((id) => castOptions.find((c) => c.id === id))
                .filter(Boolean)
                .map((c) => ({ fullName: c!.fullName }));
              onChange(cast);
            }}
            onCreateNew={async (name) => {
              const member = await castMembersApi.create(name);
              setCastOptions((prev) => [...prev, member]);
              return member;
            }}
            placeholder="Search or create cast member…"
          />
        );
      },
    },
    {
      key: "posterUrl",
      label: "Poster",
      hideInTable: true,
      renderField: (val, onChange) => (
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) {
              try {
                setIsPosterUploading(true);
                const url = await uploadsApi.uploadImage(file, 'poster');
                onChange(url);
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                alert(`Upload failed: ${msg}`);
              } finally {
                setIsPosterUploading(false);
              }
            }
          }} className={inputClass} />
          {isPosterUploading && <p className="text-sm text-yellow-400">Uploading poster, please wait…</p>}
          <input placeholder="Or paste URL" value={String(val ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass} />
        </div>
      ),
    },
    {
      key: "trailerUrl",
      label: "Trailer URL",
      hideInTable: true,
      renderField: (val, onChange) => (
        <input placeholder="YouTube embed URL" value={String(val ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ),
    },
  ];

  const toGenreIds = (genres: string[]) =>
    genres.map((name) => genreOptions.find((g) => g.name === name)?.id ?? "").filter(Boolean);

  const handleSave = async (row: MovieRow) => {
    try {
      await moviesApi.update(row.id, { ...row, genreIds: toGenreIds(row.genres) });
      await loadData();
    } catch (e) { setError(String(e)); }
  };
  const handleDelete = async (row: MovieRow) => {
    try { await moviesApi.remove(row.id); await loadData(); }
    catch (e) { setError(String(e)); }
  };
  const handleCreate = async (row: MovieRow) => {
    try {
      const { id: _id, createdAt: _createdAt, genres, ...rest } = row;
      await moviesApi.create({ ...rest, genreIds: toGenreIds(genres) });
      await loadData();
    } catch (e) { setError(String(e)); }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error)   return <div className="p-8 text-red-500">Error: {error}</div>;

  const validateMovie = (row: MovieRow): string | null => {
    if (isPosterUploading) return "Poster is still uploading, please wait…";
    if (!String(row.name ?? "").trim()) return "Name is required";
    if (!String(row.description ?? "").trim()) return "Description is required";
    if (!String(row.director ?? "").trim()) return "Director is required";
    if (!String(row.ageRating ?? "").trim()) return "Age rating is required";
    if (!Number(row.durationMinutes)) return "Duration must be greater than 0";
    return null;
  };

  return (
    <DataTable<MovieRow>
      showCreate
      title="Movies"
      columns={columns}
      rows={rows}
      keyField="id"
      validate={validateMovie}
      defaultRow={{
        name: "", description: "", durationMinutes: 0,
        releaseDate: new Date().toISOString().split("T")[0],
        director: "", ageRating: "", posterUrl: "", trailerUrl: "",
        isActive: true, genres: [], cast: [],
      }}
      onSave={handleSave}
      onDelete={handleDelete}
      onCreate={handleCreate}
    />
  );
}