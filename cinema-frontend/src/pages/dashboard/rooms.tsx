import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import DataTable, { type Column } from "../../components/Table";
import { roomsApi } from "../../api";
import { roomSchema, type RoomFormData } from "../../schemas/dashboard";
import type { RoomRow, RoomWithSeats, SeatResponse, SeatType } from "../../types";

const SEAT_TYPES: SeatType[] = ["Standard", "VIP", "Wheelchair"];

const columns: Column<RoomRow>[] = [
  { key: "name",      label: "Name" },
  { key: "rows",      label: "Rows" },
  { key: "cols",      label: "Cols" },
  { key: "isActive",  label: "Active", renderCell: (v) => (
    <span className={`text-xs font-medium px-2 py-0.5 ${v ? "bg-gold/20 text-gold" : "bg-white/10 text-white/40"}`}>
      {v ? "Yes" : "No"}
    </span>
  )},
  { key: "createdAt", label: "Created At" },
];

export default function Rooms() {
  const [rows, setRows]               = useState<RoomRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [editRoom, setEditRoom]       = useState<RoomWithSeats | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(false);

  useEffect(() => {
    roomsApi.list()
      .then(setRows)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const openEditor = async (row: RoomRow) => {
    setLoadingRoom(true);
    const full = await roomsApi.getById(row.id);
    setEditRoom(full);
    setLoadingRoom(false);
  };

  const handleDelete = async (row: RoomRow) => {
    await roomsApi.remove(row.id);
  };

  const handleCreate = async (name: string, numRows: number, numCols: number) => {
    const room = await roomsApi.create({ name, rows: numRows, cols: numCols });
    setRows((prev) => [...prev, room]);
    setShowCreate(false);
    setEditRoom(room);
  };

  const handleSeatToggle = async (roomId: string, seat: SeatResponse) => {
    setEditRoom((prev) =>
      prev ? { ...prev, seats: prev.seats.map((s) => s.id === seat.id ? { ...s, isActive: !s.isActive } : s) } : prev
    );
    try {
      await roomsApi.updateSeat(roomId, seat.id, { isActive: !seat.isActive });
    } catch {
      setEditRoom((prev) =>
        prev ? { ...prev, seats: prev.seats.map((s) => s.id === seat.id ? { ...s, isActive: seat.isActive } : s) } : prev
      );
      setError("Failed to update seat.");
    }
  };

  const handleSeatType = async (roomId: string, seat: SeatResponse, seatType: SeatType) => {
    setEditRoom((prev) =>
      prev ? { ...prev, seats: prev.seats.map((s) => s.id === seat.id ? { ...s, seatType } : s) } : prev
    );

    try {
      await roomsApi.updateSeat(roomId, seat.id, { seatType });
    } catch {
      setEditRoom((prev) =>
        prev ? { ...prev, seats: prev.seats.map((s) => s.id === seat.id ? { ...s, seatType: seat.seatType } : s) } : prev
      );
      setError("Failed to update seat type.");
    }
  };

  if (loading) return <div className="p-8 text-white/50">Loading...</div>;
  if (error)   return <div className="p-8 text-red-400">Error: {error}</div>;

  return (
    <>
      <DataTable<RoomRow>
        showCreate
        title="Rooms"
        columns={columns}
        rows={rows}
        keyField="id"
        onDelete={handleDelete}
        onEditOverride={openEditor}
        onCreateClick={() => setShowCreate(true)}
      />

      {showCreate && (
        <RoomFormModal
          onCancel={() => setShowCreate(false)}
          onConfirm={(name, rows, cols) => handleCreate(name, rows, cols)}
        />
      )}

      {loadingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-dash-card p-8 text-white/50">Loading room...</div>
        </div>
      )}

      {editRoom && (
        <SeatEditorModal
          room={editRoom}
          onClose={() => setEditRoom(null)}
          onSeatToggle={handleSeatToggle}
          onSeatTypeChange={handleSeatType}
        />
      )}
    </>
  );
}

function RoomFormModal({ initial, onCancel, onConfirm }: {
  initial?: { name: string; rows: number; cols: number };
  onCancel: () => void;
  onConfirm: (name: string, rows: number, cols: number) => void;
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: initial?.name ?? "",
      rows: initial?.rows ?? 8,
      cols: initial?.cols ?? 12,
    },
  });

  const watchedRows = Math.min(Math.max(Math.floor(watch("rows") || 1), 1), 50);
  const watchedCols = Math.min(Math.max(Math.floor(watch("cols") || 1), 1), 50);
  const rowLabels = Array.from({ length: watchedRows }, (_, i) => String.fromCharCode(65 + i));
  const isEdit = !!initial;

  const onSubmit = (data: RoomFormData) => onConfirm(data.name.trim(), data.rows, data.cols);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onCancel}>
      <form
        className="bg-dash-card shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{isEdit ? "Edit Room" : "New Room"}</h2>
          <button type="button" onClick={onCancel} className="p-1.5 text-white/50 hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Name</label>
            <input
              type="text"
              {...register("name")}
              placeholder="e.g. Hall 1"
              className="w-full text-sm text-white bg-dash-surface px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Rows</label>
              <input
                type="number" min={1} max={50}
                {...register("rows", { valueAsNumber: true })}
                className="w-full text-sm text-white bg-dash-surface px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
              {errors.rows && <p className="mt-1 text-xs text-red-400">{errors.rows.message}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Cols</label>
              <input
                type="number" min={1} max={50}
                {...register("cols", { valueAsNumber: true })}
                className="w-full text-sm text-white bg-dash-surface px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
              {errors.cols && <p className="mt-1 text-xs text-red-400">{errors.cols.message}</p>}
            </div>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">Preview</p>
          <div className="text-center mb-3">
            <div className="mx-auto h-1 w-40 bg-white/20" />
            <span className="text-xs text-white/40 tracking-widest uppercase mt-1 block">Screen</span>
          </div>
          <div className="space-y-1.5 overflow-x-auto">
            {rowLabels.map((label) => (
              <div key={label} className="flex items-center justify-center gap-3">
                <span className="text-xs text-white/40 w-4 text-right">{label}</span>
                <div className="flex gap-1">
                  {Array.from({ length: watchedCols }, (_, c) => (
                    <div key={c} className="w-5 h-5 bg-white/10" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onCancel} className="text-sm font-medium px-4 py-2 text-white/70 hover:bg-white/5">
            Cancel
          </button>
          <button
            type="submit"
            className="text-sm font-medium px-4 py-2 bg-wine text-white hover:bg-wine/80 active:scale-95 transition-all disabled:opacity-40"
          >
            {isEdit ? "Save Changes" : "Create Room"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SeatEditorModal({ room, onClose, onSeatToggle, onSeatTypeChange }: {
  room: RoomWithSeats;
  onClose: () => void;
  onSeatToggle: (roomId: string, seat: SeatResponse) => void;
  onSeatTypeChange: (roomId: string, seat: SeatResponse, type: SeatType) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? room.seats.find((s) => s.id === selectedId) ?? null : null;

  const grouped = room.seats.reduce<Record<string, SeatResponse[]>>((acc, s) => {
    (acc[s.rowLabel] ??= []).push(s);
    return acc;
  }, {});

  const seatColor = (s: SeatResponse) => {
    if (!s.isActive) return "bg-white/5 border border-white/10 text-white/20";
    if (s.seatType === "VIP") return "bg-gold/20 border border-gold/50 text-gold";
    if (s.seatType === "Wheelchair") return "bg-accessible/20 border border-accessible/50 text-accessible";
    return "bg-wine border border-wine/70 text-white";
  };

  const seatActiveRing = (s: SeatResponse) => {
    if (!s.isActive) return "ring-white/20";
    if (s.seatType === "VIP") return "ring-gold";
    if (s.seatType === "Wheelchair") return "ring-accessible";
    return "ring-wine";
  };

  const seatTypeButtonClass = (type: SeatType, selectedType: SeatType) => {
    if (type !== selectedType) return "border-dash-border text-white/60 hover:bg-white/10";
    if (type === "VIP") return "bg-gold text-stage border-gold shadow-sm";
    if (type === "Wheelchair") return "bg-accessible text-stage border-accessible shadow-sm";
    return "bg-wine text-white border-wine shadow-sm";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-dash-card shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-lg font-semibold text-white">{room.name}</h2>
            <p className="text-xs text-white/40 mt-0.5">
              {room.rows} rows × {room.cols} cols · {room.seats.filter(s => s.isActive).length} active seats
            </p>
          </div>
          <div className="flex items-center">
            <button onClick={onClose} className="p-1.5 text-white/50 hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-xs text-white/50 mt-3">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-wine inline-block" /> Standard</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gold/20 border border-gold/50 inline-block" /> VIP</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-accessible/20 border border-accessible/50 inline-block" /> Wheelchair</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-white/5 border border-white/10 inline-block" /> Removed</span>
        </div>

        <div className="text-center mb-4">
          <div className="mx-auto h-1.5 w-48 bg-white/20" />
          <span className="text-xs text-white/40 tracking-widest uppercase mt-1 block">Screen</span>
        </div>

        <div className="space-y-1.5 overflow-x-auto pb-2 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
          {Object.keys(grouped).sort().map((label) => (
            <div key={label} className="flex items-center justify-center gap-3 w-full">
              <span className="text-xs text-white/40 w-4 text-right">{label}</span>
              <div className="flex gap-1 flex-wrap justify-center">
                {grouped[label].sort((a, b) => a.colNumber - b.colNumber).map((seat) => (
                  <button
                    key={seat.id}
                    onClick={() => setSelectedId(selectedId === seat.id ? null : seat.id)}
                    title={`${seat.rowLabel}${seat.colNumber} · ${seat.seatType}`}
                    className={`w-6 h-6 text-[10px] font-medium transition-all active:scale-90
                      ${seatColor(seat)}
                      ${selectedId === seat.id ? `ring-2 ring-offset-1 ring-offset-dash-card ${seatActiveRing(seat)} scale-110` : ""}
                    `}
                  >
                    {seat.colNumber}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selected && (
          <div className="mt-5 p-4 bg-dash-surface">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
              Seat {selected.rowLabel}{selected.colNumber} · {selected.seatType}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSeatToggle(room.id, selected)}
                className={`text-xs font-medium px-3 py-1.5 border transition-all active:scale-95
                  ${selected.isActive
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-gold/30 text-gold hover:bg-gold/10"}`}
              >
                {selected.isActive ? "Remove seat" : "Restore seat"}
              </button>
              {selected.isActive && SEAT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => onSeatTypeChange(room.id, selected, type)}
                  className={`text-xs font-medium px-3 py-1.5 border transition-all active:scale-95
                    ${seatTypeButtonClass(type, selected.seatType)}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="text-sm font-medium px-4 py-2 bg-wine text-white hover:bg-wine/80 active:scale-95 transition-all">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
