import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { schedulesApi, ticketsApi, moviesApi } from '../api'
import { isAuthenticated } from '../auth'
import type { ScheduleRow, TicketRow, MovieRow } from '../types'

export default function SeatSelectionPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const navigate = useNavigate()

  const [schedule, setSchedule] = useState<ScheduleRow | null>(null)
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [movie, setMovie] = useState<MovieRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ticketCount, setTicketCount] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!scheduleId) return
    if (!isAuthenticated()) { navigate('/register'); return }

    Promise.all([schedulesApi.getById(scheduleId), ticketsApi.getBySchedule(scheduleId)])
      .then(([sched, tkts]) => {
        setSchedule(sched)
        setTickets(tkts)
        return moviesApi.getById(sched.movieId)
      })
      .then(setMovie)
      .catch(() => setError('Failed to load seat map.'))
      .finally(() => setLoading(false))
  }, [scheduleId, navigate])

  const seatMap = buildSeatMap(tickets)
  const rows = Object.keys(seatMap).sort()
  const selectedTickets = tickets.filter((t) => selectedIds.includes(t.id))
  const totalPrice = selectedTickets.reduce((s, t) => s + t.price, 0)
  const canProceed = selectedIds.length === ticketCount

  function toggleSeat(ticket: TicketRow) {
    if (ticket.status === 'Sold') return
    setSelectedIds((prev) => {
      if (prev.includes(ticket.id)) return prev.filter((id) => id !== ticket.id)
      if (prev.length >= ticketCount) return prev
      return [...prev, ticket.id]
    })
  }

  function handleCountChange(delta: number) {
    const next = Math.max(1, Math.min(10, ticketCount + delta))
    setTicketCount(next)
    if (selectedIds.length > next) setSelectedIds((prev) => prev.slice(0, next))
  }

  function handleContinue() {
    if (!canProceed || !scheduleId) return
    navigate(`/booking/${scheduleId}/payment`, {
      state: { ticketIds: selectedIds, scheduleId },
    })
  }

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Loading seats...</p>
    </div>
  )

  if (error || !schedule) return (
    <div className="min-h-[80vh] flex items-center justify-center flex-col gap-4">
      <p className="text-red-400 text-sm">{error ?? 'Schedule not found'}</p>
      <button onClick={() => navigate(-1)} className="text-white/40 text-xs hover:text-white transition-colors">← Go back</button>
    </div>
  )

  const posterSrc = movie?.posterUrl
    ? (movie.posterUrl.startsWith('http') ? movie.posterUrl : `http://localhost:5000${movie.posterUrl}`)
    : null

  const dayLabel = formatDay(schedule.scheduleDay)

  return (
    <div className="min-h-screen bg-stage text-white">
      <div className="max-w-7xl mx-auto px-8 py-10">

        {/* Page header */}
        <div className="mb-7">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest hover:text-white transition-colors mb-4"
          >
            <span>←</span> Back
          </button>
          <h1 className="text-3xl font-bold uppercase tracking-wide leading-none">
            {schedule.movieName}
          </h1>
          <p className="text-white/50 mt-2 text-sm">
            {schedule.roomName} · {dayLabel} at {schedule.startTime}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6 items-start">

          {/* Left: Theater */}
          <div className="flex-1 min-w-0">
            <div className="bg-[#111] rounded p-8 pb-10">
              {/* Screen */}
              <div className="mb-12 text-center px-8">
                <svg viewBox="0 0 600 28" className="w-full max-w-xl mx-auto" fill="none">
                  <path d="M 20 26 Q 300 2 580 26" stroke="white" strokeOpacity="0.35" strokeWidth="2" />
                </svg>
                <p className="text-[10px] uppercase tracking-[0.5em] text-white/25 mt-1">Screen</p>
              </div>

              {/* Seat grid */}
              <div className="flex flex-col items-center gap-2.5">
                {rows.map((rowLabel) => (
                  <div key={rowLabel} className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs text-white/25 font-mono shrink-0 select-none">
                      {rowLabel}
                    </span>
                    <div className="flex gap-1.5">
                      {seatMap[rowLabel].map((ticket) => (
                        <SeatBtn
                          key={ticket.id}
                          ticket={ticket}
                          selected={selectedIds.includes(ticket.id)}
                          onClick={() => toggleSeat(ticket)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-10 flex flex-wrap justify-center gap-8 text-xs text-white/40">
                <LegendDot cls="bg-white/20 border border-white/25" label="Available" />
                <LegendDot cls="bg-[#f5c518]" label="Selected" />
                <LegendDot cls="bg-[#6b1a2a] border border-[#f5c518]/30" label="VIP" />
                <LegendDot cls="bg-white/5 border border-white/10" label="Sold" />
              </div>
            </div>
          </div>

          {/* Right: Sidebar */}
          <div className="w-[300px] shrink-0 sticky top-6 flex flex-col gap-4">

            {/* Movie info card */}
            <div className="bg-[#141414] border border-white/10 rounded p-5">
              <div className="flex gap-3 items-start">
                {posterSrc && (
                  <img src={posterSrc} alt={schedule.movieName} className="w-12 h-[68px] object-cover rounded-sm shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-bold text-[#f5c518] text-sm leading-snug truncate">{schedule.movieName}</p>
                  <p className="text-white/50 text-xs mt-1">{schedule.roomName}</p>
                  <p className="text-white/70 text-xs mt-1">{dayLabel}</p>
                  <p className="text-[#f5c518] font-bold text-xl leading-none mt-0.5">{schedule.startTime}</p>
                </div>
              </div>
            </div>

            {/* Ticket control card — the red rectangle area */}
            <div className="bg-[#141414] border border-white/10 rounded p-6 flex flex-col gap-5">

              {/* Ticket count */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Number of tickets</p>
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => handleCountChange(-1)}
                    className="w-9 h-9 rounded border border-white/20 hover:border-white/50 flex items-center justify-center text-xl font-light transition-colors"
                  >−</button>
                  <span className="text-3xl font-bold tabular-nums w-8 text-center">{ticketCount}</span>
                  <button
                    onClick={() => handleCountChange(1)}
                    className="w-9 h-9 rounded border border-white/20 hover:border-white/50 flex items-center justify-center text-xl font-light transition-colors"
                  >+</button>
                </div>
                <p className="text-xs mt-2.5">
                  {selectedIds.length < ticketCount
                    ? <span className="text-white/30">Pick {ticketCount - selectedIds.length} more seat{ticketCount - selectedIds.length !== 1 ? 's' : ''}</span>
                    : <span className="text-green-400 text-xs">All seats selected ✓</span>
                  }
                </p>
              </div>

              {/* Selected seats */}
              {selectedTickets.length > 0 && (
                <>
                  <div className="border-t border-white/10" />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">Selected seats</p>
                    <div className="space-y-2.5">
                      {selectedTickets.map((t) => (
                        <div key={t.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-sm bg-[#f5c518] text-black text-xs font-bold flex items-center justify-center shrink-0">
                              {t.rowLabel}{t.colNumber}
                            </span>
                            <span className="text-sm text-white/50">
                              {t.seatType !== 'Standard'
                                ? <span className="text-[#f5c518]/80 text-xs">{t.seatType}</span>
                                : 'Standard'}
                            </span>
                          </div>
                          <span className="text-sm font-mono text-white/60">${t.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Total */}
              {selectedTickets.length > 0 && (
                <>
                  <div className="border-t border-white/10" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white/40">Total</span>
                    <span className="text-xl font-bold text-[#f5c518]">${totalPrice.toFixed(2)}</span>
                  </div>
                </>
              )}

              <button
                onClick={handleContinue}
                disabled={!canProceed}
                className="w-full py-3.5 rounded text-xs uppercase tracking-widest font-bold transition-all
                  disabled:opacity-20 disabled:cursor-not-allowed
                  bg-[#f5c518] text-black hover:bg-[#e6b800]"
              >
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SeatBtn({ ticket, selected, onClick }: { ticket: TicketRow; selected: boolean; onClick: () => void }) {
  const sold = ticket.status === 'Sold'
  const vip = ticket.seatType === 'VIP'

  let cls = 'w-8 h-8 rounded-sm text-[9px] font-bold transition-all flex items-center justify-center select-none '

  if (sold) {
    cls += 'bg-white/5 border border-white/8 cursor-not-allowed text-white/15'
  } else if (selected) {
    cls += 'bg-[#f5c518] text-black cursor-pointer shadow-md shadow-yellow-500/20 scale-110'
  } else if (vip) {
    cls += 'bg-[#3d0f18] border border-[#f5c518]/30 cursor-pointer hover:border-[#f5c518]/70 hover:bg-[#6b1a2a] text-white/50 hover:text-white'
  } else {
    cls += 'bg-white/15 border border-white/20 cursor-pointer hover:bg-white/25 hover:border-white/40 text-white/40 hover:text-white'
  }

  return (
    <button className={cls} onClick={onClick} disabled={sold} title={`${ticket.rowLabel}${ticket.colNumber}`}>
      {ticket.colNumber}
    </button>
  )
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-4 h-4 rounded-sm ${cls}`} />
      <span>{label}</span>
    </div>
  )
}

function buildSeatMap(tickets: TicketRow[]): Record<string, TicketRow[]> {
  const map: Record<string, TicketRow[]> = {}
  for (const t of tickets) {
    if (!map[t.rowLabel]) map[t.rowLabel] = []
    map[t.rowLabel].push(t)
  }
  for (const row of Object.values(map)) row.sort((a, b) => a.colNumber - b.colNumber)
  return map
}

function formatDay(dateStr: string): string {
  const day = dateStr?.split('T')[0] ?? ''
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const [, mm, dd] = day.split('-')
  const short = `${dd}.${mm}.`
  if (day === today) return `Today, ${short}`
  if (day === tomorrow) return `Tomorrow, ${short}`
  return short
}
