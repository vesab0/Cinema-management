import { useEffect, useState } from "react";
import DataTable, { type Column } from "../../components/Table";
import { userTicketsApi, ticketsApi, schedulesApi, usersApi, moviesApi } from "../../api";
import type { UserTicketRow, TicketRow, ScheduleRow, UserRow, MovieRow } from "../../types";

const columns: Column<UserTicketRow>[] = [
  { key: "confirmationCode", label: "Code" },
  { key: "userFullName",     label: "User" },
  { key: "userEmail",        label: "Email" },
  { key: "movieName",        label: "Movie" },
  { key: "scheduleDay",      label: "Date", renderCell: (v) => <span>{String(v).split("T")[0]}</span> },
  { key: "startTime",        label: "Time" },
  { key: "roomName",         label: "Room" },
  { key: "rowLabel",         label: "Row" },
  { key: "colNumber",        label: "Seat" },
  { key: "seatType",         label: "Type" },
  { key: "price",            label: "Price (€)" },
  { key: "isUsed",           label: "Used", renderCell: (v) => (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${v ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
      {v ? "Yes" : "No"}
    </span>
  )},
  { key: "purchasedAt", label: "Purchased At" },
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

  // Load available tickets when schedule changes
  useEffect(() => {
    if (!scheduleId) { setTickets([]); setTicketId(""); return; }
    ticketsApi.getBySchedule(scheduleId).then((t) => {
      const available = t.filter((tk) => tk.status === "Available");
      setTickets(available);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
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
        <div className="space-y-4 min-h-[120px]">

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
                <p className="text-sm text-gray-400">No available seats for this schedule.</p>
              ) : (
                <select value={ticketId} onChange={(e) => setTicketId(e.target.value)} className={inputClass}>
                  <option value="">— choose a seat —</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      Row {t.rowLabel}, Seat {t.colNumber} — {t.seatType} — €{t.price}
                    </option>
                  ))}
                </select>
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
        onCreateClick={() => setShowModal(true)}
        columns={columns}
        rows={rows}
        keyField="id"
        onSave={async () => {}}
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
