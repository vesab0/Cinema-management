import { useEffect, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { userTicketsApi, ticketsApi, schedulesApi, usersApi, moviesApi } from "../../api";
import type { UserTicketRow, TicketRow, ScheduleRow, UserRow, MovieRow } from "../../types";

const columns: Column<UserTicketRow>[] = [
  { key: "confirmationCode", label: "Code",       width: "130px" },
  { key: "userFullName",     label: "User",       width: "140px" },
  { key: "userEmail",        label: "Email",      width: "170px", hideInTable: true },
  { key: "movieName",        label: "Movie",      width: "160px" },
  { key: "scheduleDay",      label: "Date",       width: "100px", renderCell: (v) => <span className="text-sm text-gray-700">{String(v).split("T")[0]}</span> },
  { key: "startTime",        label: "Time",       width: "70px" },
  { key: "roomName",         label: "Room",       width: "90px" },
  { key: "rowLabel",         label: "Row",        width: "55px" },
  { key: "colNumber",        label: "Seat",       width: "55px" },
  { key: "seatType",         label: "Type",       width: "90px" },
  { key: "price",            label: "Price (€)",  width: "80px" },
  { key: "isUsed",           label: "Used",       width: "60px", renderCell: (v) => (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      {v ? "Yes" : "No"}
    </span>
  )},
  { key: "purchasedAt", label: "Purchased At", width: "100px", renderCell: (v) => <span className="text-sm text-gray-700">{String(v).split("T")[0]}</span> },
];

// ── Booking creation modal ────────────────────────────────────────────────────

type Step = "user" | "movie" | "schedule" | "seat";

function CreateBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: UserTicketRow) => void;
}) {
  const inputClass = "w-full text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-all";
  const labelClass = "block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1";

  const [users,     setUsers]     = useState<UserRow[]>([]);
  const [movies,    setMovies]    = useState<MovieRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [tickets,   setTickets]   = useState<TicketRow[]>([]);

  const [userId,     setUserId]     = useState("");
  const [movieId,    setMovieId]    = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [ticketId,   setTicketId]   = useState("");

  const [step,    setStep]    = useState<Step>("user");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Load users + movies once on open
  useEffect(() => {
    Promise.all([usersApi.list(), moviesApi.list()]).then(([u, m]) => {
      setUsers(u);
      setMovies(m);
    });
  }, []);

  // Load schedules when movie changes
  useEffect(() => {
    if (!movieId) { setSchedules([]); setScheduleId(""); setTickets([]); setTicketId(""); return; }
    schedulesApi.getByMovie(movieId).then((s) => {
      setSchedules(s);
      setScheduleId("");
      setTickets([]);
      setTicketId("");
    });
  }, [movieId]);

  // Load all tickets when schedule changes (available + sold, to render full seat map)
  useEffect(() => {
    if (!scheduleId) { setTickets([]); setTicketId(""); return; }
    ticketsApi.getBySchedule(scheduleId).then((t) => {
      setTickets(t);
      setTicketId("");
    });
  }, [scheduleId]);

  const canAdvance: Record<Step, boolean> = {
    user:     !!userId,
    movie:    !!movieId,
    schedule: !!scheduleId,
    seat:     !!ticketId,
  };

  const steps: Step[] = ["user", "movie", "schedule", "seat"];
  const stepIndex = steps.indexOf(step);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await userTicketsApi.purchase({ userId, ticketId });
      onCreated(result);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedUser     = users.find((u) => u.id === userId);
  const selectedMovie    = movies.find((m) => m.id === movieId);
  const selectedSchedule = schedules.find((s) => s.id === scheduleId);
  const selectedTicket   = tickets.find((t) => t.id === ticketId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className={`bg-white rounded-xl shadow-xl w-full mx-4 p-6 transition-all ${step === "seat" ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800">New Booking</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < stepIndex ? "bg-gray-800 text-white" :
                i === stepIndex ? "bg-gray-800 text-white ring-2 ring-gray-300" :
                "bg-gray-100 text-gray-400"
              }`}>{i + 1}</div>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < stepIndex ? "bg-gray-400" : "bg-gray-200"}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-400 capitalize">{step}</span>
        </div>

        {/* Step content */}
        <div className={`space-y-4 ${step === "seat" ? "min-h-[160px]" : "min-h-[120px]"}`}>

          {step === "user" && (
            <div>
              <label className={labelClass}>Select User</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass}>
                <option value="">— choose a user —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          {step === "movie" && (
            <div>
              <label className={labelClass}>Select Movie</label>
              <select value={movieId} onChange={(e) => setMovieId(e.target.value)} className={inputClass}>
                <option value="">— choose a movie —</option>
                {movies.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {step === "schedule" && (
            <div>
              <label className={labelClass}>Select Schedule</label>
              {schedules.length === 0 ? (
                <p className="text-sm text-gray-400">No active schedules for this movie.</p>
              ) : (
                <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className={inputClass}>
                  <option value="">— choose a schedule —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {String(s.scheduleDay).split("T")[0]} at {s.startTime} — {s.roomName}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {step === "seat" && (
            <div>
              <label className={labelClass}>Select Seat</label>
              {tickets.length === 0 ? (
                <p className="text-sm text-gray-400">No seats for this schedule.</p>
              ) : (
                <SeatMap tickets={tickets} selectedTicketId={ticketId} onSelect={setTicketId} />
              )}
            </div>
          )}

          {/* Summary chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {selectedUser     && <Chip label={selectedUser.fullName} />}
            {selectedMovie    && <Chip label={selectedMovie.name} />}
            {selectedSchedule && <Chip label={`${String(selectedSchedule.scheduleDay).split("T")[0]} ${selectedSchedule.startTime}`} />}
            {selectedTicket   && <Chip label={`Row ${selectedTicket.rowLabel} Seat ${selectedTicket.colNumber}`} />}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {/* Navigation */}
        <div className="flex justify-between gap-2 mt-6">
          <button
            onClick={() => stepIndex > 0 ? setStep(steps[stepIndex - 1]) : onClose()}
            className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
          >
            {stepIndex === 0 ? "Cancel" : "Back"}
          </button>

          {step !== "seat" ? (
            <button
              onClick={() => setStep(steps[stepIndex + 1])}
              disabled={!canAdvance[step]}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canAdvance.seat || loading}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? "Creating…" : "Create Booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SeatMap({ tickets, selectedTicketId, onSelect }: {
  tickets: TicketRow[];
  selectedTicketId: string;
  onSelect: (ticketId: string) => void;
}) {
  const grouped = tickets.reduce<Record<string, TicketRow[]>>((acc, t) => {
    (acc[t.rowLabel] ??= []).push(t);
    return acc;
  }, {});

  const seatColor = (t: TicketRow) => {
    if (t.status !== "Available") return "bg-gray-100 border border-gray-200 text-gray-300 cursor-not-allowed";
    if (t.seatType === "VIP") return "bg-amber-100 border border-amber-300 text-amber-700 hover:brightness-95";
    if (t.seatType === "Wheelchair") return "bg-blue-100 border border-blue-300 text-blue-700 hover:brightness-95";
    return "bg-gray-700 border border-gray-600 text-white hover:bg-gray-600";
  };

  const ringColor = (t: TicketRow) => {
    if (t.seatType === "VIP") return "ring-amber-500";
    if (t.seatType === "Wheelchair") return "ring-blue-500";
    return "ring-gray-800";
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-700 inline-block" /> Standard</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-300 inline-block" /> VIP</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block" /> Wheelchair</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200 inline-block" /> Sold</span>
      </div>

      <div className="text-center mb-3">
        <div className="mx-auto h-1.5 w-40 bg-gray-300 rounded-full" />
        <span className="text-xs text-gray-400 tracking-widest uppercase mt-1 block">Screen</span>
      </div>

      <div className="space-y-1.5 overflow-x-auto pb-1 flex flex-col items-center">
        {Object.keys(grouped).sort().map((rowLabel) => (
          <div key={rowLabel} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-4 text-right">{rowLabel}</span>
            <div className="flex gap-1">
              {grouped[rowLabel].sort((a, b) => a.colNumber - b.colNumber).map((t) => (
                <button
                  key={t.id}
                  disabled={t.status !== "Available"}
                  onClick={() => onSelect(selectedTicketId === t.id ? "" : t.id)}
                  title={`${t.rowLabel}${t.colNumber} · ${t.seatType} · €${t.price}${t.status !== "Available" ? " · Sold" : ""}`}
                  className={`w-6 h-6 rounded-sm text-[10px] font-medium transition-all active:scale-90
                    ${seatColor(t)}
                    ${selectedTicketId === t.id ? `ring-2 ring-offset-1 ${ringColor(t)} scale-110` : ""}
                  `}
                >
                  {t.colNumber}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedTicket && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Selected: <span className="font-semibold text-gray-700">Row {selectedTicket.rowLabel}, Seat {selectedTicket.colNumber}</span> · {selectedTicket.seatType} · <span className="font-semibold">€{selectedTicket.price}</span>
        </p>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserTickets() {
  const [rows,         setRows]         = useState<UserTicketRow[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);

  useEffect(() => {
    userTicketsApi
      .list()
      .then((data) => setRows(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (row: UserTicketRow) => {
    try { await userTicketsApi.cancel(row.id); }
    catch (e) { setError(String(e)); }
  };

  const handleCreated = (row: UserTicketRow) => {
    setRows((prev) => [row, ...prev]);
  };

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;
  if (error)   return <div className="p-8 text-red-500">Error: {error}</div>;

  return (
    <>
      <DataTable<UserTicketRow>
        title="Bookings"
        showCreate
        noEdit
        onCreateClick={() => setShowModal(true)}
        columns={columns}
        rows={rows}
        keyField="id"
        onDelete={handleDelete}
      />

      {showModal && (
        <CreateBookingModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  );
}
