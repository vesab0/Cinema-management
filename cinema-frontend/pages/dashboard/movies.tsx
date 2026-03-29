import { useEffect, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { castMembersApi, genresApi, moviesApi, uploadsApi } from "../../src/api";
import type { CastMemberOption, GenreOption, MovieRow } from "../../src/types";

const inputClass = "w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all";

function MultiSelect({
  ids, options, labelKey, onChangeIds, onCreateNew, createPlaceholder,
}: {
  ids: string[];
  options: { id: string; [key: string]: string }[];
  labelKey: string;
  onChangeIds: (ids: string[]) => void;
  onCreateNew: (name: string) => Promise<void>;
  createPlaceholder: string;
}) {
  const [newName, setNewName] = useState("");
  const update = (index: number, val: string) => onChangeIds(ids.map((id, i) => (i === index ? val : id)));
  const add = () => onChangeIds([...ids, ""]);
  const remove = (index: number) => onChangeIds(ids.filter((_, i) => i !== index));
  const create = async () => {
    if (!newName.trim()) return;
    await onCreateNew(newName.trim());
    setNewName("");
  };
  return (
    <div className="space-y-2">
      {ids.map((id, index) => (
        <div key={index} className="flex gap-2">
          <select value={id} onChange={(e) => update(index, e.target.value)} className={inputClass}>
            <option value="">Select...</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o[labelKey]}</option>)}
          </select>
          <button type="button" onClick={() => remove(index)} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">-</button>
        </div>
      ))}
      <button type="button" onClick={add} className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">+ Add row</button>
      <div className="flex gap-2 mt-1">
        <input placeholder={createPlaceholder} value={newName} onChange={(e) => setNewName(e.target.value)} className={inputClass} />
        <button type="button" onClick={create} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm">Add</button>
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
    { key: "name",            label: "Name" },
    { key: "director",        label: "Director" },
    { key: "durationMinutes", label: "Duration (min)", type: "number" },
    { key: "ageRating",       label: "Age Rating" },
    { key: "isActive",        label: "Active", type: "select", options: ["true", "false"] },
    { key: "createdAt",       label: "Created At", hideInModal: true },
    {
      key: "releaseDate",
      label: "Release Date",
      renderField: (val, onChange) => (
        <input type="date" value={String(val ?? "").split("T")[0]} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      ),
    },
    {
      key: "genres",
      label: "Genres",
      renderCell: (val) => (
        <span className="text-sm text-gray-700 px-1.5">{(val as string[]).join(", ")}</span>
      ),
      renderField: (val, onChange) => {
        const selected = (val as string[]) ?? [];
        const ids = selected.map((name) => genreOptions.find((g) => g.name === name)?.id ?? "").filter(Boolean);
        return (
          <MultiSelect
            ids={ids.length ? ids : [""]}
            options={genreOptions as { id: string; [key: string]: string }[]}
            labelKey="name"
            onChangeIds={(newIds) => {
              const names = newIds.map((id) => genreOptions.find((g) => g.id === id)?.name ?? "").filter(Boolean);
              onChange(names);
            }}
            onCreateNew={async (name) => {
              const genre = await genresApi.create(name);
              setGenreOptions((prev) => [...prev, genre]);
            }}
            createPlaceholder="New genre name"
          />
        );
      },
    },
    {
      key: "cast",
      label: "Cast",
      renderCell: (val) => (
        <span className="text-sm text-gray-700 px-1.5">{(val as { fullName: string }[]).map((c) => c.fullName).join(", ")}</span>
      ),
      renderField: (val, onChange) => {
        const selected = (val as { fullName: string }[]) ?? [];
        const ids = selected.map((entry) => castOptions.find((c) => c.fullName === entry.fullName)?.id ?? "").filter(Boolean);
        return (
          <MultiSelect
            ids={ids.length ? ids : [""]}
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
            }}
            createPlaceholder="New cast member name"
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
            if (file) { const url = await uploadsApi.uploadImage(file); onChange(url); }
          }} className={inputClass} />
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

  const handleSave = async (row: MovieRow) => { await moviesApi.update(row.id, row); await loadData(); };
  const handleDelete = async (row: MovieRow) => { await moviesApi.remove(row.id); await loadData(); };
  const handleCreate = async (row: MovieRow) => { await moviesApi.create(row); await loadData(); };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error)   return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <DataTable<MovieRow>
      showCreate
      title="Movies"
      columns={columns}
      rows={rows}
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