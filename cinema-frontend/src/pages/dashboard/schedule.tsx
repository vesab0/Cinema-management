import { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { moviesApi, roomsApi, schedulesApi, ticketsApi } from "../../api";
import { scheduleEditSchema, rangeCreateSchema, type ScheduleEditFormData } from "../../schemas/dashboard";
import type { ScheduleRow, RoomOption } from "../../types";
import ConfirmModal from "../../components/ConfirmModal";

const inputClass =
  "w-full text-sm text-white bg-[#1c1a18] rounded-lg px-3 py-2 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all";
const labelClass =
  "block text-xs font-semibold text-white/50 uppercase tracking-widest mb-1";

const HOUR_HEIGHT = 48; // px per hour
const START_HOUR = 9;
const END_HOUR = 24; // midnight
const TOTAL_HOURS = END_HOUR - START_HOUR; // 9:00 → 00:00 = 15 hours
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type MovieMeta = { id: string; name: string; durationMinutes: number };
type MovieOption = { id: string; name: string };

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

// ── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  schedule,
  movieOptions,
  roomOptions,
  onClose,
  onConfirm,
}: {
  schedule: ScheduleRow;
  movieOptions: MovieOption[];
  roomOptions: RoomOption[];
  onClose: () => void;
  onConfirm: (data: ScheduleEditFormData) => Promise<void>;
}) {
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<ScheduleEditFormData>({
    resolver: zodResolver(scheduleEditSchema),
    defaultValues: {
      movieName: schedule.movieName,
      roomName: schedule.roomName,
      scheduleDay: String(schedule.scheduleDay).split("T")[0],
      startTime: schedule.startTime,
      isActive: schedule.isActive,
    },
  });
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (data: ScheduleEditFormData) => {
    setServerError(null);
    try {
      await onConfirm(data);
      onClose();
    } catch (e) {
      setServerError(String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <form
        className="bg-[#141210] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Edit Schedule</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md text-white/50 hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={labelClass}>Movie</label>
            <select {...register("movieName")} className={inputClass}>
              <option value="" className="bg-dash-card">Select movie...</option>
              {movieOptions.map((m) => <option key={m.id} value={m.name} className="bg-dash-card">{m.name}</option>)}
            </select>
            {errors.movieName && <p className="mt-1 text-xs text-red-400">{errors.movieName.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Room</label>
            <select {...register("roomName")} className={inputClass}>
              <option value="" className="bg-dash-card">Select room...</option>
              {roomOptions.map((r) => <option key={r.id} value={r.name} className="bg-dash-card">{r.name}</option>)}
            </select>
            {errors.roomName && <p className="mt-1 text-xs text-red-400">{errors.roomName.message}</p>}
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Date</label>
              <input type="date" {...register("scheduleDay")} className={inputClass} />
              {errors.scheduleDay && <p className="mt-1 text-xs text-red-400">{errors.scheduleDay.message}</p>}
            </div>
            <div className="flex-1">
              <label className={labelClass}>Time</label>
              <input type="time" {...register("startTime")} className={inputClass} />
              {errors.startTime && <p className="mt-1 text-xs text-red-400">{errors.startTime.message}</p>}
            </div>
          </div>
          <div>
            <label className={labelClass}>Active</label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <select
                  value={String(field.value)}
                  onChange={(e) => field.onChange(e.target.value === "true")}
                  className={inputClass}
                >
                  <option value="true" className="bg-dash-card">Yes</option>
                  <option value="false" className="bg-dash-card">No</option>
                </select>
              )}
            />
          </div>
        </div>

        {serverError && <p className="mt-3 text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg text-white/70 hover:bg-white/5">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="text-sm font-medium px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine/80 active:scale-95 disabled:opacity-40 transition-all">
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Schedule Detail Popover ──────────────────────────────────────────────────

function ScheduleDetail({
  schedule,
  duration,
  onEdit,
  onDelete,
  onClose,
}: {
  schedule: ScheduleRow;
  duration: number;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
        onClick={onClose}
      >
        <div
          className="bg-[#141210] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] w-full max-w-xs mx-4 p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-white text-sm">{schedule.movieName}</p>
              <p className="text-xs text-white/40 mt-0.5">{schedule.roomName}</p>
            </div>
            <button onClick={onClose} className="p-1 rounded text-white/40 hover:bg-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50 mb-4 flex-wrap">
            <span>{String(schedule.scheduleDay).split("T")[0]}</span>
            <span className="font-medium text-white/80">{schedule.startTime}</span>
            <span className="text-white/40">{duration}m</span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${schedule.isActive ? "bg-gold/20 text-gold" : "bg-white/10 text-white/40"}`}>
              {schedule.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 transition-all">Edit</button>
            <button onClick={() => setConfirming(true)} className="flex-1 text-xs font-medium px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all">Delete</button>
          </div>
        </div>
      </div>

      {confirming && (
        <ConfirmModal
          onConfirm={onDelete}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

// ── Overlap detection ────────────────────────────────────────────────────────

function findConflicts(
  schedules: ScheduleRow[],
  movieMetas: MovieMeta[],
  roomName: string,
  date: string,
  startTime: string,
  newDuration: number
): ScheduleRow[] {
  const newStart = timeToMinutes(startTime);
  const newEnd = newStart + newDuration;
  return schedules.filter((s) => {
    if (String(s.scheduleDay).split("T")[0] !== date) return false;
    if (s.roomName !== roomName) return false;
    const existStart = timeToMinutes(s.startTime);
    const existDuration =
      movieMetas.find((m) => m.id === s.movieId)?.durationMinutes ?? 90;
    return newStart < existStart + existDuration && newEnd > existStart;
  });
}

// ── Range Create Modal ───────────────────────────────────────────────────────

function RangeCreateModal({
  movieOptions,
  roomOptions,
  schedules,
  movieMetas,
  initialRoom,
  initialDate,
  initialTime,
  onClose,
  onCreated,
}: {
  movieOptions: MovieOption[];
  roomOptions: RoomOption[];
  schedules: ScheduleRow[];
  movieMetas: MovieMeta[];
  initialRoom?: string;
  initialDate?: string;
  initialTime?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = formatDate(new Date());
  const [movieName, setMovieName] = useState("");
  const [roomName, setRoomName] = useState(initialRoom ?? "");
  const [fromDate, setFromDate] = useState(initialDate ?? today);
  const [toDate, setToDate] = useState(initialDate ?? today);
  const [activeDays, setActiveDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [times, setTimes] = useState([initialTime ?? "14:00"]);
  const [price, setPrice] = useState(0);
  const [vipPrice, setVipPrice] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (idx: number) =>
    setActiveDays((d) =>
      d.includes(idx) ? d.filter((x) => x !== idx) : [...d, idx].sort()
    );

  const addTime = () => setTimes((t) => [...t, "14:00"]);
  const removeTime = (i: number) => setTimes((t) => t.filter((_, idx) => idx !== i));
  const updateTime = (i: number, val: string) =>
    setTimes((t) => t.map((v, idx) => (idx === i ? val : v)));

  const scheduleDates = useMemo(() => {
    if (!fromDate || !toDate || fromDate > toDate) return [];
    const dates: string[] = [];
    const cur = new Date(fromDate + "T00:00:00");
    const end = new Date(toDate + "T00:00:00");
    while (cur <= end) {
      const dow = (cur.getDay() + 6) % 7;
      if (activeDays.includes(dow)) dates.push(formatDate(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [fromDate, toDate, activeDays]);

  const validTimes = times.filter(Boolean);
  const totalCount = scheduleDates.length * validTimes.length;

  const handleSubmit = async () => {
    const parseResult = rangeCreateSchema.safeParse({ movieName, roomName, fromDate, toDate, price, vipPrice: vipPrice === "" ? undefined : vipPrice });
    if (!parseResult.success) {
      setError(parseResult.error.errors[0].message);
      return;
    }
    if (validTimes.length === 0) { setError("Add at least one time slot"); return; }
    if (totalCount === 0) { setError("No dates match the selected criteria"); return; }

    const movieId = movieOptions.find((m) => m.name === movieName)?.id;
    const roomId = roomOptions.find((r) => r.name === roomName)?.id;
    if (!movieId || !roomId) { setError("Invalid movie or room"); return; }

    const newDuration = movieMetas.find((m) => m.name === movieName)?.durationMinutes ?? 90;
    const conflicts: string[] = [];
    for (const date of scheduleDates) {
      for (const time of validTimes) {
        const hits = findConflicts(schedules, movieMetas, roomName, date, time, newDuration);
        if (hits.length > 0) {
          conflicts.push(`${date} ${time} — conflicts with "${hits[0].movieName}" (${hits[0].startTime})`);
        }
      }
    }
    if (conflicts.length > 0) {
      setError(`Overlap detected:\n${conflicts.slice(0, 3).join("\n")}${conflicts.length > 3 ? `\n…and ${conflicts.length - 3} more` : ""}`);
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        scheduleDates.flatMap((date) =>
          validTimes.map((time) =>
            schedulesApi.create({
              movieId,
              roomId,
              scheduleDay: date,
              startTime: time,
              ticketPrice: price,
              vipTicketPrice: vipPrice === "" ? undefined : vipPrice,
              isActive: true,
            })
          )
        )
      );
      onCreated();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-[#141210] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Create Schedules</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-white/50 hover:bg-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Movie</label>
              <select value={movieName} onChange={(e) => setMovieName(e.target.value)} className={inputClass}>
                <option value="" className="bg-dash-card">Select movie...</option>
                {movieOptions.map((m) => <option key={m.id} value={m.name} className="bg-dash-card">{m.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className={labelClass}>Room</label>
              <select value={roomName} onChange={(e) => setRoomName(e.target.value)} className={inputClass}>
                <option value="" className="bg-dash-card">Select room...</option>
                {roomOptions.map((r) => <option key={r.id} value={r.name} className="bg-dash-card">{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex-1">
              <label className={labelClass}>To Date</label>
              <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Days of Week</label>
            <div className="flex gap-1.5 mt-1">
              {DAYS_OF_WEEK.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-all ${
                    activeDays.includes(i)
                      ? "bg-wine text-white border-wine"
                      : "bg-[#1c1a18] text-white/50 border-dash-border hover:border-white/30"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass}>Time Slots</label>
              <button type="button" onClick={addTime} className="text-xs font-medium text-gold hover:text-gold/80 transition-colors">
                + Add time
              </button>
            </div>
            <div className="space-y-2">
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => updateTime(i, e.target.value)}
                    className={inputClass}
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(i)}
                      className="flex-shrink-0 p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className={labelClass}>Ticket Price (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>VIP Ticket Price (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Same as standard"
                value={vipPrice}
                onChange={(e) => setVipPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                className={inputClass}
              />
            </div>
          </div>

          {totalCount > 0 && (
            <div className="text-xs text-white/50 bg-[#1c1a18] rounded-lg px-3 py-2">
              Will create{" "}
              <span className="font-semibold text-white">{totalCount}</span>{" "}
              schedule{totalCount !== 1 ? "s" : ""} across{" "}
              <span className="font-semibold text-white">{scheduleDates.length}</span>{" "}
              day{scheduleDates.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400 whitespace-pre-line bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="text-sm font-medium px-4 py-2 rounded-lg text-white/70 hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || totalCount === 0}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine/80 active:scale-95 disabled:opacity-40 transition-all"
          >
            {saving
              ? `Creating ${totalCount}…`
              : `Create ${totalCount} Schedule${totalCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Grid ────────────────────────────────────────────────────────────

function CalendarGrid({
  schedules,
  rooms,
  movieMetas,
  selectedDate,
  ticketCounts,
  onCellClick,
  onScheduleClick,
}: {
  schedules: ScheduleRow[];
  rooms: RoomOption[];
  movieMetas: MovieMeta[];
  selectedDate: string;
  ticketCounts: Record<string, { sold: number; available: number }>;
  onCellClick: (roomName: string, time: string) => void;
  onScheduleClick: (schedule: ScheduleRow) => void;
}) {
  const gridHeight = TOTAL_HOURS * HOUR_HEIGHT;

  // Schedules for this day, grouped by room
  const byRoom = useMemo(() => {
    const map: Record<string, ScheduleRow[]> = {};
    for (const s of schedules) {
      if (String(s.scheduleDay).split("T")[0] !== selectedDate) continue;
      if (!map[s.roomName]) map[s.roomName] = [];
      map[s.roomName].push(s);
    }
    return map;
  }, [schedules, selectedDate]);

  const handleAreaClick = (roomName: string, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinutes = (y / HOUR_HEIGHT) * 60;
    // Snap to nearest 15 minutes
    const snapped = Math.round(rawMinutes / 15) * 15;
    const totalMins = START_HOUR * 60 + Math.max(0, snapped);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    onCellClick(roomName, time);
  };

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 text-white/40 text-sm">
        No rooms configured yet.
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto">
      {/* Time label column */}
      <div className="flex-shrink-0 w-14">
        {/* header spacer */}
        <div className="h-10 bg-[#1c1a18]/80" />
        {/* time labels */}
        <div className="relative" style={{ height: gridHeight }}>
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute right-2 text-[11px] text-white/40 font-medium -translate-y-2"
              style={{ top: i * HOUR_HEIGHT }}
            >
              {String((START_HOUR + i) % 24).padStart(2, "0")}:00
            </div>
          ))}
        </div>
      </div>

      {/* Room columns */}
      {rooms.map((room) => {
        const roomSchedules = byRoom[room.name] ?? [];

        return (
          <div key={room.id} className="flex-1 min-w-[160px]">
            {/* Column header */}
            <div className="h-10 flex items-center justify-center bg-[#1c1a18]/80 sticky top-0 z-10">
              <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                {room.name}
              </span>
            </div>

            {/* Schedule area */}
            <div
              className="relative cursor-pointer group/col hover:bg-wine/5 transition-colors"
              style={{ height: gridHeight }}
              onClick={(e) => handleAreaClick(room.name, e)}
            >
              {/* Hour grid lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute inset-x-0 border-t border-white/5"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {/* Half-hour lines */}
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={`h${i}`}
                  className="absolute inset-x-0 border-t border-white/[0.03]"
                  style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              ))}

              {/* "Click to add" hint */}
              {roomSchedules.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/col:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-xs text-gold font-medium bg-gold/10 px-2 py-1 rounded-md">
                    Click to add
                  </span>
                </div>
              )}


              {/* Schedule blocks */}
              {roomSchedules.map((s) => {
                const startMins = timeToMinutes(s.startTime) - START_HOUR * 60;
                const duration =
                  movieMetas.find((m) => m.id === s.movieId)?.durationMinutes ?? 90;
                const top = (startMins / 60) * HOUR_HEIGHT;
                const height = Math.max((duration / 60) * HOUR_HEIGHT, 28);
                const isShort = height < 48;

                const counts = ticketCounts[s.id];
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onScheduleClick(s);
                    }}
                    className={`absolute inset-x-1 rounded-md text-left overflow-hidden transition-all hover:brightness-110 hover:shadow-sm active:scale-[0.98] border ${
                      s.isActive
                        ? "bg-wine/40 text-white border-wine/60"
                        : "bg-white/5 text-white/40 border-white/10"
                    }`}
                    style={{ top, height, zIndex: 5 }}
                    title={`${s.movieName} — ${s.startTime} (${duration}m)${counts ? ` · ${counts.available} free · ${counts.sold} sold` : ""}`}
                  >
                    <div className="px-2 py-1">
                      <div className={`font-semibold truncate ${isShort ? "text-[10px]" : "text-[11px]"}`}>
                        {s.movieName}
                      </div>
                      {!isShort && (
                        <div className="text-[10px] opacity-60 mt-0.5">
                          {s.startTime} · {duration}m
                        </div>
                      )}
                      {!isShort && counts && (
                        <div className="text-[10px] mt-0.5 flex items-center gap-1.5">
                          <span className="text-emerald-400/80">{counts.available} free</span>
                          <span className="opacity-30">·</span>
                          <span className="opacity-50">{counts.sold} sold</span>
                        </div>
                      )}
                    </div>
                    {/* Color bar on left edge */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${s.isActive ? "bg-gold" : "bg-white/20"}`} />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function Schedules() {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movieOptions, setMovieOptions] = useState<MovieOption[]>([]);
  const [movieMetas, setMovieMetas] = useState<MovieMeta[]>([]);
  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([]);
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));

  const [ticketCounts, setTicketCounts] = useState<Record<string, { sold: number; available: number }>>({});

  const [editingRow, setEditingRow] = useState<ScheduleRow | null>(null);
  const [detailRow, setDetailRow] = useState<ScheduleRow | null>(null);
  const [rangeInitial, setRangeInitial] = useState<{
    room?: string;
    date?: string;
    time?: string;
  } | null>(null);

  const loadData = async () => {
    try {
      const [schedules, movies, rooms] = await Promise.all([
        schedulesApi.list(),
        moviesApi.list(),
        roomsApi.list(),
      ]);
      setRows(schedules);
      setMovieOptions(movies.map((m) => ({ id: m.id, name: m.name })));
      setMovieMetas(
        movies.map((m) => ({ id: m.id, name: m.name, durationMinutes: m.durationMinutes }))
      );
      setRoomOptions(rooms.map((r) => ({ id: r.id, name: r.name })));
      setError(null);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const daySchedules = rows.filter(r => String(r.scheduleDay).split("T")[0] === selectedDate);
    if (daySchedules.length === 0) return;
    Promise.all(
      daySchedules.map(s =>
        ticketsApi.getBySchedule(s.id).then(tickets => ({
          id: s.id,
          sold: tickets.filter(t => t.status === "Sold").length,
          available: tickets.filter(t => t.status === "Available").length,
        }))
      )
    ).then(results => {
      setTicketCounts(Object.fromEntries(results.map(r => [r.id, { sold: r.sold, available: r.available }])));
    });
  }, [selectedDate, rows]);

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  };

  const handleEdit = async (form: ScheduleEditFormData) => {
    if (!editingRow) return;
    const movieId = movieOptions.find((m) => m.name === form.movieName)?.id;
    const roomId = roomOptions.find((r) => r.name === form.roomName)?.id;
    if (!movieId || !roomId) throw new Error("Invalid movie or room");
    await schedulesApi.update(editingRow.id, {
      movieId,
      roomId,
      scheduleDay: form.scheduleDay,
      startTime: form.startTime,
      isActive: form.isActive,
    });
    await loadData();
  };

  const handleDelete = async (row: ScheduleRow) => {
    try {
      await schedulesApi.remove(row.id);
      setDetailRow(null);
      await loadData();
    } catch (e) {
      setError(String(e));
    }
  };

  const displayDate = useMemo(() => {
    const d = new Date(selectedDate + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate]);

  const todayStr = formatDate(new Date());
  const isToday = selectedDate === todayStr;
  const dayCount = rows.filter(
    (r) => String(r.scheduleDay).split("T")[0] === selectedDate
  ).length;

  if (loading) return <div className="p-8 text-white/50">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;

  const detailDuration =
    detailRow
      ? (movieMetas.find((m) => m.id === detailRow.movieId)?.durationMinutes ?? 90)
      : 0;

  return (
    <>
      <div className="flex flex-col h-screen p-8 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Schedules</h1>
          <button
            onClick={() => setRangeInitial({})}
            className="text-sm font-medium px-4 py-2 rounded-lg bg-wine text-white hover:bg-wine/80 active:scale-95 transition-all"
          >
            Create Schedules
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-[#141210] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col">
          {/* Date navigation */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#1c1a18]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 rounded-md text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                title="Previous day"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm font-semibold text-white border-0 bg-transparent cursor-pointer outline-none"
              />
              <span className="text-sm text-white/40 hidden sm:block">{displayDate}</span>
              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 rounded-md text-white/40 hover:bg-white/10 hover:text-white transition-colors"
                title="Next day"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {dayCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gold/20 text-gold">
                  {dayCount} showing{dayCount !== 1 ? "s" : ""}
                </span>
              )}
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg text-white/60 hover:bg-white/5 transition-all"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CalendarGrid
              schedules={rows}
              rooms={roomOptions}
              movieMetas={movieMetas}
              selectedDate={selectedDate}
              ticketCounts={ticketCounts}
              onCellClick={(roomName, time) =>
                setRangeInitial({ room: roomName, date: selectedDate, time })
              }
              onScheduleClick={setDetailRow}
            />
          </div>
        </div>
      </div>

      {rangeInitial !== null && (
        <RangeCreateModal
          movieOptions={movieOptions}
          roomOptions={roomOptions}
          schedules={rows}
          movieMetas={movieMetas}
          initialRoom={rangeInitial.room}
          initialDate={rangeInitial.date}
          initialTime={rangeInitial.time}
          onClose={() => setRangeInitial(null)}
          onCreated={loadData}
        />
      )}

      {editingRow && (
        <EditModal
          schedule={editingRow}
          movieOptions={movieOptions}
          roomOptions={roomOptions}
          onClose={() => setEditingRow(null)}
          onConfirm={handleEdit}
        />
      )}

      {detailRow && (
        <ScheduleDetail
          schedule={detailRow}
          duration={detailDuration}
          onEdit={() => {
            setEditingRow(detailRow);
            setDetailRow(null);
          }}
          onDelete={() => handleDelete(detailRow)}
          onClose={() => setDetailRow(null)}
        />
      )}
    </>
  );
}
