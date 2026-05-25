import { useEffect, useState } from "react";
import { userTicketsApi, ticketsApi, schedulesApi, usersApi, moviesApi } from "../../api";
import type { UserTicketRow, TicketRow, ScheduleRow, UserRow, MovieRow } from "../../types";
import ConfirmModal from "../../components/ConfirmModal";

// ── Booking creation modal ────────────────────────────────────────────────────

type Step = "user" | "movie" | "schedule" | "seat";

function CreateBookingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (row: UserTicketRow) => void;
}) {
  const inputClass = "w-full text-sm text-white bg-[#1c1a18] rounded-lg px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all";
  const labelClass = "block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1";

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

  useEffect(() => {
    Promise.all([usersApi.list(), moviesApi.list()]).then(([u, m]) => {
      setUsers(u);
      setMovies(m);
    });
  }, []);

  useEffect(() => {
    if (!movieId) { setSchedules([]); setScheduleId(""); setTickets([]); setTicketId(""); return; }
    schedulesApi.getByMovie(movieId).then((s) => {
      setSchedules(s);
      setScheduleId("");
      setTickets([]);
      setTicketId("");
    });
  }, [movieId]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className={`bg-[#141210] rounded-xl shadow-xl w-full mx-4 p-6 transition-all ${step === "seat" ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-md"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Booking</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-white/50 hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                i < stepIndex ? "bg-white/20 text-white" :
                i === stepIndex ? "bg-gold text-stage ring-2 ring-gold/30" :
                "bg-white/10 text-white/30"
              }`}>{i + 1}</div>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < stepIndex ? "bg-white/30" : "bg-white/10"}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-white/40 capitalize">{step}</span>
        </div>

        <div className={`space-y-4 ${step === "seat" ? "min-h-[160px]" : "min-h-[120px]"}`}>
          {step === "user" && (
            <div>
              <label className={labelClass}>Select User</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputClass}>
                <option value="" className="bg-[#141210]">— choose a user —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-[#141210]">{u.fullName} ({u.email})</option>
                ))}
              </select>
            </div>
          )}

          {step === "movie" && (
            <div>
              <label className={labelClass}>Select Movie</label>
              <select value={movieId} onChange={(e) => setMovieId(e.target.value)} className={inputClass}>
                <option value="" className="bg-[#141210]">— choose a movie —</option>
                {movies.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#141210]">{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {step === "schedule" && (
            <div>
              <label className={labelClass}>Select Schedule</label>
              {schedules.length === 0 ? (
                <p className="text-sm text-white/40">No active schedules for this movie.</p>
              ) : (
                <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className={inputClass}>
                  <option value="" className="bg-[#141210]">— choose a schedule —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#141210]">
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
                <p className="text-sm text-white/40">No seats for this schedule.</p>
              ) : (
                <SeatMap tickets={tickets} selectedTicketId={ticketId} onSelect={setTicketId} />
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {selectedUser     && <Chip label={selectedUser.fullName} />}
            {selectedMovie    && <Chip label={selectedMovie.name} />}
            {selectedSchedule && <Chip label={`${String(selectedSchedule.scheduleDay).split("T")[0]} ${selectedSchedule.startTime}`} />}
            {selectedTicket   && <Chip label={`Row ${selectedTicket.rowLabel} Seat ${selectedTicket.colNumber}`} />}
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="flex justify-between gap-2 mt-6">
          <button
            onClick={() => stepIndex > 0 ? setStep(steps[stepIndex - 1]) : onClose()}
            className="text-sm font-medium px-4 py-2 rounded-lg text-white/70 hover:bg-white/5 transition-all"
          >
            {stepIndex === 0 ? "Cancel" : "Back"}
          </button>

          {step !== "seat" ? (
            <button
              onClick={() => setStep(steps[stepIndex + 1])}
              disabled={!canAdvance[step]}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine/80 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={!canAdvance.seat || loading}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine/80 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
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
    if (t.status !== "Available") return "bg-white/5 border border-white/10 text-white/20 cursor-not-allowed";
    if (t.seatType === "VIP") return "bg-gold/20 border border-gold/50 text-gold hover:brightness-110";
    if (t.seatType === "Wheelchair") return "bg-gold/30 border border-gold/60 text-gold hover:brightness-110";
    return "bg-wine border border-wine/70 text-white hover:brightness-110";
  };

  const ringColor = (t: TicketRow) => {
    if (t.seatType === "VIP") return "ring-gold";
    if (t.seatType === "Wheelchair") return "ring-gold";
    return "ring-wine";
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div>
      <div className="flex gap-4 mb-3 text-xs text-white/50">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-wine inline-block" /> Standard</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gold/20 border border-gold/50 inline-block" /> VIP</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gold/30 border border-gold/60 inline-block" /> Wheelchair</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white/5 border border-white/10 inline-block" /> Sold</span>
      </div>

      <div className="text-center mb-3">
        <div className="mx-auto h-1.5 w-40 bg-white/20 rounded-full" />
        <span className="text-xs text-white/40 tracking-widest uppercase mt-1 block">Screen</span>
      </div>

      <div className="space-y-1.5 overflow-x-auto pb-1 flex flex-col items-center">
        {Object.keys(grouped).sort().map((rowLabel) => (
          <div key={rowLabel} className="flex items-center gap-3">
            <span className="text-xs text-white/40 w-4 text-right">{rowLabel}</span>
            <div className="flex gap-1">
              {grouped[rowLabel].sort((a, b) => a.colNumber - b.colNumber).map((t) => (
                <button
                  key={t.id}
                  disabled={t.status !== "Available"}
                  onClick={() => onSelect(selectedTicketId === t.id ? "" : t.id)}
                  title={`${t.rowLabel}${t.colNumber} · ${t.seatType} · €${t.price}${t.status !== "Available" ? " · Sold" : ""}`}
                  className={`w-6 h-6 rounded-sm text-[10px] font-medium transition-all active:scale-90
                    ${seatColor(t)}
                    ${selectedTicketId === t.id ? `ring-2 ring-offset-1 ring-offset-dash-card ${ringColor(t)} scale-110` : ""}
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
        <p className="mt-3 text-xs text-white/50 text-center">
          Selected: <span className="font-semibold text-white">Row {selectedTicket.rowLabel}, Seat {selectedTicket.colNumber}</span> · {selectedTicket.seatType} · <span className="font-semibold text-gold">€{selectedTicket.price}</span>
        </p>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/70">
      {label}
    </span>
  );
}

// ── Financials grouped view ───────────────────────────────────────────────────

type MovieGroup = {
  movieName: string;
  tickets: UserTicketRow[];
  totalRevenue: number;
  byType: Record<string, { count: number; revenue: number }>;
};

function groupByMovie(rows: UserTicketRow[]): MovieGroup[] {
  const map = new Map<string, MovieGroup>();
  for (const row of rows) {
    if (!map.has(row.movieName)) {
      map.set(row.movieName, { movieName: row.movieName, tickets: [], totalRevenue: 0, byType: {} });
    }
    const g = map.get(row.movieName)!;
    g.tickets.push(row);
    g.totalRevenue += row.price;
    if (!g.byType[row.seatType]) g.byType[row.seatType] = { count: 0, revenue: 0 };
    g.byType[row.seatType].count++;
    g.byType[row.seatType].revenue += row.price;
  }
  return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

const SEAT_TYPE_COLORS: Record<string, string> = {
  VIP:         "bg-gold/20 text-gold",
  Wheelchair:  "bg-gold/30 text-gold",
  Standard:    "bg-white/10 text-white/60",
};

function MovieFinancialCard({
  group,
  onDelete,
}: {
  group: MovieGroup;
  onDelete: (row: UserTicketRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserTicketRow | null>(null);

  return (
    <div className="bg-[#141210] rounded-xl overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{group.movieName}</p>
        </div>

        {/* Revenue highlight */}
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-gold">€{group.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-white/40">{group.tickets.length} ticket{group.tickets.length !== 1 ? "s" : ""}</p>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded ticket table */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1c1a18] text-xs text-white/50 uppercase tracking-wider">
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Time</th>
                <th className="px-4 py-2 text-left font-medium">Room</th>
                <th className="px-4 py-2 text-left font-medium">Seat</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="px-4 py-2 text-right font-medium">Price</th>
                <th className="px-4 py-2 text-left font-medium">Purchased</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {group.tickets.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs text-white/40">{t.confirmationCode}</td>
                  <td className="px-4 py-2.5 text-white font-medium">{t.userFullName}</td>
                  <td className="px-4 py-2.5 text-white/60">{String(t.scheduleDay).split("T")[0]}</td>
                  <td className="px-4 py-2.5 text-white/60">{t.startTime}</td>
                  <td className="px-4 py-2.5 text-white/60">{t.roomName}</td>
                  <td className="px-4 py-2.5 text-white/60">{t.rowLabel}{t.colNumber}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SEAT_TYPE_COLORS[t.seatType] ?? "bg-white/10 text-white/60"}`}>
                      {t.seatType}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gold">€{t.price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-white/40 text-xs">{String(t.purchasedAt).split("T")[0]}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setPendingDelete(t)}
                      className="p-1 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Cancel booking"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          message="Are you sure you want to cancel this booking?"
          onConfirm={() => { onDelete(pendingDelete); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserTickets() {
  const [rows,      setRows]      = useState<UserTicketRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    userTicketsApi
      .list()
      .then((data) => setRows(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (row: UserTicketRow) => {
    try {
      await userTicketsApi.cancel(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (e) {
      setError(String(e));
    }
  };

  const handleCreated = (row: UserTicketRow) => {
    setRows((prev) => [row, ...prev]);
  };

  if (loading) return <div className="p-8 text-white/50">Loading...</div>;
  if (error)   return <div className="p-8 text-red-400">Error: {error}</div>;

  const groups = groupByMovie(rows);
  const totalRevenue = rows.reduce((sum, r) => sum + r.price, 0);
  const totalTickets = rows.length;

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Financials</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine/80 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Booking
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#141210] rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gold">€{totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-[#141210] rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Tickets Sold</p>
          <p className="text-3xl font-bold text-white">{totalTickets}</p>
        </div>
        <div className="bg-[#141210] rounded-xl px-5 py-4">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Movies</p>
          <p className="text-3xl font-bold text-white">{groups.length}</p>
        </div>
      </div>

      {/* Movie groups */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-white/40">No bookings yet.</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <MovieFinancialCard key={g.movieName} group={g} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateBookingModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
