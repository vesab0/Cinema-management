import { useEffect, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { moviesApi, roomsApi, schedulesApi } from "../../api";
import type { ScheduleRow, MovieOption, RoomOption } from "../../types";

const inputClass = "w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all";

export default function Schedules() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movieOptions, setMovieOptions] = useState<MovieOption[]>([]);
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);

  const loadData = async () => {
    try {
      const [schedules, movies, rooms] = await Promise.all([
        schedulesApi.list(),
        moviesApi.list(),
        roomsApi.list(),
      ]);

      setRows(schedules);
      setMovieOptions(movies.map(m => ({ id: m.id, name: m.name })));
      setRoomOptions(rooms.map(r => ({ id: r.id, name: r.name })));
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  const columns: Column<ScheduleRow>[] = [
    {
      key: "movieName",
      label: "Movie",
      renderField: (val, onChange) => (
        <select value={String(val ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Select movie...</option>
          {movieOptions.map((m) => (
            <option key={m.id} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "roomName",
      label: "Room",
      renderField: (val, onChange) => (
        <select value={String(val ?? "")} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          <option value="">Select room...</option>
          {roomOptions.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "scheduleDay",
      label: "Date",
      renderField: (val, onChange) => (
        <input
          type="date"
          value={String(val ?? "").split("T")[0]}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ),
    },
    {
      key: "startTime",
      label: "Time",
      renderField: (val, onChange) => (
        <input
          type="time"
          value={String(val ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ),
    },
    {
      key: "isActive",
      label: "Active",
      type: "select",
      options: ["true", "false"],
    },
    {
      key: "createdAt",
      label: "Created At",
      hideInModal: true,
    },
  ];

  const handleSave = async (row: ScheduleRow) => {
    try {
      const movieId = movieOptions.find(m => m.name === row.movieName)?.id;
      const roomId = roomOptions.find(r => r.name === row.roomName)?.id;

      if (!movieId || !roomId) {
        setError("Movie and room must be selected");
        return;
      }

      await schedulesApi.update(row.id, {
        movieId,
        roomId,
        scheduleDay: row.scheduleDay,
        startTime: row.startTime,
        isActive: row.isActive,
      });
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (row: ScheduleRow) => {
    try {
      await schedulesApi.remove(row.id);
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleCreate = async (row: ScheduleRow) => {
    try {
      const movieId = movieOptions.find(m => m.name === row.movieName)?.id;
      const roomId = roomOptions.find(r => r.name === row.roomName)?.id;

      if (!movieId || !roomId) {
        setError("Movie and room must be selected");
        return;
      }

      await schedulesApi.create({
        movieId,
        roomId,
        scheduleDay: row.scheduleDay,
        startTime: row.startTime,
        isActive: row.isActive ?? true,
      });
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const validateSchedule = (row: ScheduleRow): string | null => {
    if (!String(row.movieName ?? "").trim()) return "Movie is required";
    if (!String(row.roomName ?? "").trim()) return "Room is required";
    if (!String(row.scheduleDay ?? "").trim()) return "Date is required";
    if (!String(row.startTime ?? "").trim()) return "Time is required";
    return null;
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <DataTable<ScheduleRow>
      showCreate
      title="Movie Schedules"
      columns={columns}
      rows={rows}
      keyField="id"
      validate={validateSchedule}
      defaultRow={{
        id: "",
        movieId: "",
        movieName: "",
        roomId: "",
        roomName: "",
        scheduleDay: new Date().toISOString().split("T")[0],
        startTime: "14:00",
        createdAt: new Date().toISOString().split("T")[0],
        isActive: true,
      }}
      onSave={handleSave}
      onDelete={handleDelete}
      onCreate={handleCreate}
    />
  );
}
