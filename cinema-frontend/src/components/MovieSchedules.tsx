import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { schedulesApi } from '../api'
import type { ScheduleRow } from '../types'

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

export default function MovieSchedules({ movieId }: Props) {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!movieId) return
    let cancelled = false
    setLoading(true)
    schedulesApi
      .list()
      .then((rows) => {
        if (cancelled) return
        setSchedules(rows)
        setError(null)
      })
      .catch(() => {
        if (cancelled) return
        setError('Unable to load schedules.')
        setSchedules([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [movieId])

  const groupedByDay = useMemo(() => {
    const now = Date.now()
    const filtered = schedules
      .filter((s) => {
        if (s.movieId !== movieId) return false
        const day = s.scheduleDay?.split('T')[0] ?? ''
        const [hh, mm] = (s.startTime ?? '00:00').split(':').map(Number)
        const start = new Date(day)
        start.setHours(hh, mm, 0, 0)
        return start.getTime() > now
      })
      .sort((a, b) =>
        `${a.scheduleDay} ${a.startTime}`.localeCompare(`${b.scheduleDay} ${b.startTime}`)
      )
    const map = new Map<string, ScheduleRow[]>()
    for (const s of filtered) {
      const day = s.scheduleDay?.split('T')[0] ?? 'Unknown'
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(s)
    }
    return map
  }, [movieId, schedules])

  if (!movieId) return null

  return (
    <section className="mt-10 px-0 py-6">
      <h2 className="text-2xl font-bold uppercase tracking-wide text-[#f5c518] mb-8">
        Twin Peaks Cinema – Prishtina
      </h2>
      {loading && <p className="text-sm text-white/50">Loading...</p>}
      {!loading && error && <p className="text-sm text-red-400">{error}</p>}
      {!loading && !error && groupedByDay.size === 0 && (
        <p className="text-sm text-white/50">No showtimes yet.</p>
      )}
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
    </section>
  )
}