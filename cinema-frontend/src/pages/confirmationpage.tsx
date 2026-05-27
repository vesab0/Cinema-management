import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { schedulesApi } from '../api'
import { useState } from 'react'
import type { UserTicketRow, ScheduleRow } from '../types'

export default function ConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const state = location.state as { purchases: UserTicketRow[] } | null
  const purchases: UserTicketRow[] = state?.purchases ?? []
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null)

  useEffect(() => {
    if (!purchases.length || !scheduleId) { navigate('/'); return }
    schedulesApi.getById(scheduleId).then(setSchedule).catch(() => {})
  }, [])

  if (!purchases.length) return null

  const total = purchases.reduce((s, p) => s + p.price, 0)

  return (
    <div className="min-h-screen bg-stage text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#f5c518]">
            Booking Confirmed
          </h1>
          {schedule && (
            <p className="text-white/60 mt-2">
              {schedule.movieName} · {schedule.roomName}
            </p>
          )}
        </div>

        <div className="bg-[#1a1a1a] border border-white/10 rounded divide-y divide-white/10">
          {purchases.map((p) => (
            <div key={p.id} className="p-4 text-left">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">
                    Row {p.rowLabel}, Seat {p.colNumber}
                    {p.seatType !== 'Standard' && (
                      <span className="ml-2 text-[#f5c518] text-xs">({p.seatType})</span>
                    )}
                  </p>
                  <p className="text-white/50 text-sm mt-0.5">
                    {p.scheduleDay?.split('T')[0]} · {p.startTime}
                  </p>
                </div>
                <span className="text-[#f5c518] font-bold">€{p.price.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-xs font-mono text-white/40 tracking-widest">
                #{p.confirmationCode}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-white/40 text-sm">Total</span>
          <span className="text-[#f5c518] font-bold text-lg">€{total.toFixed(2)}</span>
        </div>

        <p className="text-xs text-white/40">
          A confirmation email is on its way. Show your code at the door.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/profile')}
            className="px-6 py-2.5 text-sm uppercase tracking-widest font-bold bg-[#f5c518] text-black hover:bg-[#e6b800] transition-colors rounded-sm"
          >
            My Tickets
          </button>
          <button
            onClick={() => navigate('/movies')}
            className="px-6 py-2.5 text-sm uppercase tracking-widest font-bold border border-white/20 hover:border-white/50 transition-colors rounded-sm"
          >
            More Movies
          </button>
        </div>
      </div>
    </div>
  )
}