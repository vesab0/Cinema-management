import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { schedulesApi } from '../api'
import type { PagedSchedulesResponse, ScheduleRow } from '../types'

const PAGE_SIZE = 4

type Props = {
  movieId?: string
}

function getDayLabel(dateStr: string): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const [, mm, dd] = dateStr.split('-')
  const short = `${dd}.${mm}.`
  if (dateStr === fmt(today)) return `Sot, ${short}`
  if (dateStr === fmt(tomorrow)) return `Nesër, ${short}`
  return short
}

function getDropdownLabel(dateStr: string): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const [, mm, dd] = dateStr.split('-')
  const short = `${dd}.${mm}.`
  if (dateStr === fmt(today)) return `Sot — ${short}`
  if (dateStr === fmt(tomorrow)) return `Nesër — ${short}`
  return short
}

export default function MovieSchedules({ movieId }: Props) {
  const navigate = useNavigate()
  const [data, setData] = useState<PagedSchedulesResponse | null>(null)
  const [page, setPage] = useState(1)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!movieId) return
    let cancelled = false
    if (data === null) {
      setLoading(true)
    } else {
      setTransitioning(true)
    }
    schedulesApi
      .getByMoviePaged(movieId, page, PAGE_SIZE, selectedDate || undefined)
      .then((result) => {
        if (cancelled) return
        setData(result)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('Unable to load schedules.')
        setData(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
          setTransitioning(false)
        }
      })
    return () => { cancelled = true }
  }, [movieId, page, selectedDate])

  const groupedByDay = useMemo(() => {
    const map = new Map<string, ScheduleRow[]>()
    for (const s of data?.items ?? []) {
      const day = s.scheduleDay?.split('T')[0] ?? 'Unknown'
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(s)
    }
    return map
  }, [data])

  if (!movieId) return null

  const totalPages = data?.totalPages ?? 1
  const availableDates = data?.availableDates ?? []

  function handleDateChange(value: string) {
    setSelectedDate(value)
    setPage(1)
  }

  return (
    <section className="mt-10 px-0 py-6">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-[#f5c518]">
          Twin Peaks Cinema – Prishtina
        </h2>
        {availableDates.length > 0 && (
          <select
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-[#1a1a1a] border border-white/20 text-white text-sm rounded-sm px-3 py-2 focus:outline-none focus:border-[#f5c518] cursor-pointer"
          >
            <option value="">Të gjitha datat</option>
            {availableDates.map((d) => (
              <option key={d} value={d}>
                {getDropdownLabel(d)}
              </option>
            ))}
          </select>
        )}
      </div>
      {loading && <p className="text-sm text-white/50">Loading...</p>}
      {!loading && error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && groupedByDay.size === 0 && !transitioning && (
        <p className="text-sm text-white/50">No showtimes yet.</p>
      )}
      <div className={transitioning ? 'opacity-40 pointer-events-none' : ''}>
      {!loading && !error && [...groupedByDay.entries()].map(([day, daySchedules]) => (
        <div key={day} className="mb-7">
          <p className="text-xs uppercase tracking-widest text-[#f5c518] mb-3">
            {getDayLabel(day)}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {daySchedules.map((schedule) => (
              <div
                key={schedule.id}
                onClick={() => navigate(`/booking/${schedule.id}`)}
                className="bg-[#6b1a2a] hover:bg-[#822033] border border-transparent hover:border-[#f5c518] transition-colors p-4 min-w-[110px] cursor-pointer rounded-sm"
              >
                <div className="text-2xl font-bold text-white leading-none">
                  {schedule.startTime}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {schedule.roomName}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      </div>
      {!loading && !error && !selectedDate && totalPages > 1 && (
        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm bg-[#6b1a2a] text-white rounded-sm disabled:opacity-30 hover:bg-[#822033] transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-white/60">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm bg-[#6b1a2a] text-white rounded-sm disabled:opacity-30 hover:bg-[#822033] transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </section>
  )
}
