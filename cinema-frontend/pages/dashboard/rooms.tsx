import { useEffect, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { roomsApi } from "../../src/api";
import type { RoomRow, RoomWithSeats, SeatResponse, SeatType } from "../../src/types";

const SEAT_TYPES: SeatType[] = ["Standard", "VIP", "Wheelchair"];

const columns: Column<RoomRow>[] = [
  { key: "name",      label: "Name" },
  { key: "rows",      label: "Rows" },
  { key: "cols",      label: "Cols" },
  { key: "isActive",  label: "Active", renderCell: (v) => (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
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

  const handleCreate = async (name: string, rows: number, cols: number) => {
    const room = await roomsApi.create({ name, rows, cols });
    setRows((prev) => [...prev, room]);
    setShowCreate(false);
    setEditRoom(room);
  };

  const handleRoomSave = async (id: string, name: string) => {
    await roomsApi.update(id, { name });
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, name } : r));
    setEditRoom((prev) => prev ? { ...prev, name } : prev);
  };

  const handleSeatToggle = async (roomId: string, seat: SeatResponse) => {
    await roomsApi.updateSeat(roomId, seat.id, { isActive: !seat.isActive });
    setEditRoom((prev) =>
      prev ? { ...prev, seats: prev.seats.map((s) => s.id === seat.id ? { ...s, isActive: !s.isActive } : s) } : prev
    );
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

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error)   return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <>
      <DataTable<RoomRow>
        title="Rooms"
        columns={columns}
        rows={rows}
        onDelete={handleDelete}
        onEditOverride={openEditor}
        showCreate={false}
      />

      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm font-medium bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-gray-700 active:scale-95 transition-all"
        >
          + New Room
        </button>
      </div>

      {showCreate && (
        <RoomFormModal
          onCancel={() => setShowCreate(false)}
          onConfirm={(name, rows, cols) => handleCreate(name, rows, cols)}
        />
      )}

      {loadingRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-8 text-gray-500">Loading room...</div>
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
  const [name, setName] = useState(initial?.name ?? "");
  const [rows, setRows] = useState(initial?.rows ?? 8);
  const [cols, setCols] = useState(initial?.cols ?? 12);

  const rowLabels = Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i));
  const isEdit = !!initial;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">{isEdit ? "Edit Room" : "New Room"}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hall 1"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Rows</label>
              <input
                type="number" min={1} max={26} value={rows}
                onChange={(e) => setRows(Math.min(26, Math.max(1, +e.target.value)))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Cols</label>
              <input
                type="number" min={1} max={30} value={cols}
                onChange={(e) => setCols(Math.min(30, Math.max(1, +e.target.value)))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Preview</p>
          <div className="text-center mb-3">
            <div className="mx-auto h-1 w-40 bg-gray-200 rounded-full" />
            <span className="text-xs text-gray-400 tracking-widest uppercase mt-1 block">Screen</span>
          </div>
          <div className="space-y-1.5 overflow-x-auto">
            {rowLabels.map((label) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 w-4 text-right shrink-0">{label}</span>
                <div className="flex gap-1">
                  {Array.from({ length: cols }, (_, c) => (
                    <div key={c} className="w-5 h-5 rounded-sm bg-gray-200" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => name.trim() && onConfirm(name.trim(), rows, cols)}
            disabled={!name.trim()}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40"
          >
            {isEdit ? "Save Changes" : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeatEditorModal({ room, onClose, onSeatToggle, onSeatTypeChange }: {
  room: RoomWithSeats;
  onClose: () => void;
  onSeatToggle: (roomId: string, seat: SeatResponse) => void;
  onSeatTypeChange: (roomId: string, seat: SeatResponse, type: SeatType) => void;
}) {
  const [selectedId, setSelectedId]   = useState<string | null>(null);

  const selected = selectedId ? room.seats.find((s) => s.id === selectedId) ?? null : null;

  const grouped = room.seats.reduce<Record<string, SeatResponse[]>>((acc, s) => {
    (acc[s.rowLabel] ??= []).push(s);
    return acc;
  }, {});

  const seatColor = (s: SeatResponse) => {
    if (!s.isActive) return "bg-gray-100 border border-gray-200 text-gray-300";
    if (s.seatType === "VIP") return "bg-amber-100 border border-amber-300 text-amber-700";
    if (s.seatType === "Wheelchair") return "bg-blue-100 border border-blue-300 text-blue-700";
    return "bg-gray-700 border border-gray-600 text-white";
  };

  const seatActiveRing = (s: SeatResponse) => {
    if (!s.isActive) return "ring-gray-400";
    if (s.seatType === "VIP") return "ring-amber-500";
    if (s.seatType === "Wheelchair") return "ring-blue-500";
    return "ring-gray-800";
  };

  const seatTypeButtonClass = (type: SeatType, selectedType: SeatType) => {
    if (type !== selectedType) return "border-gray-200 text-gray-600 hover:bg-gray-100";
    if (type === "VIP") return "bg-amber-500 text-white border-amber-500 shadow-sm";
    if (type === "Wheelchair") return "bg-blue-500 text-white border-blue-500 shadow-sm";
    return "bg-gray-800 text-white border-gray-800 shadow-sm";
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{room.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {room.rows} rows × {room.cols} cols · {room.seats.filter(s => s.isActive).length} active seats
              </p>
            </div>
            <div className="flex items-center">
              <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex gap-4 mb-4 text-xs text-gray-500 mt-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-700 inline-block" /> Standard</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block" /> VIP</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block" /> Wheelchair</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> Removed</span>
          </div>

          <div className="text-center mb-4">
            <div className="mx-auto h-1.5 w-48 bg-gray-300 rounded-full" />
            <span className="text-xs text-gray-400 tracking-widest uppercase mt-1 block">Screen</span>
          </div>

          <div className="space-y-1.5 overflow-x-auto pb-2 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {Object.keys(grouped).sort().map((label) => (
              <div key={label} className="flex items-center gap-1.5 justify-center w-full">
                <span className="text-xs text-gray-400 w-4 text-right shrink-0">{label}</span>
                <div className="flex gap-1 flex-wrap">
                  {grouped[label].sort((a, b) => a.colNumber - b.colNumber).map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => setSelectedId(selectedId === seat.id ? null : seat.id)}
                      title={`${seat.rowLabel}${seat.colNumber} · ${seat.seatType}`}
                      className={`w-6 h-6 rounded-sm text-[10px] font-medium transition-all active:scale-90
                        ${seatColor(seat)}
                        ${selectedId === seat.id ? `ring-2 ring-offset-1 ${seatActiveRing(seat)} scale-110` : ""}
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
            <div className="mt-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                Seat {selected.rowLabel}{selected.colNumber} · {selected.seatType}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onSeatToggle(room.id, selected)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all active:scale-95
                    ${selected.isActive
                      ? "border-red-200 text-red-600 hover:bg-red-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"}`}
                >
                  {selected.isActive ? "Remove seat" : "Restore seat"}
                </button>
                {selected.isActive && SEAT_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => onSeatTypeChange(room.id, selected, type)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all active:scale-95
                      ${seatTypeButtonClass(type, selected.seatType)}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-5">
            <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all">
              Done
            </button>
          </div>
        </div>
      </div>

    </>
  );
}