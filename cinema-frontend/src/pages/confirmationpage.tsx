import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { userTicketsApi, schedulesApi } from '../api'
import { getUserId } from '../auth'
import type { UserTicketRow, ScheduleRow } from '../types'

export default function ConfirmationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { scheduleId } = useParams<{ scheduleId: string }>()

  const state = location.state as { ticketIds: string[] } | null
  const ticketIds: string[] = state?.ticketIds ?? []

  const [purchases, setPurchases] = useState<UserTicketRow[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null)
  const [loading, setLoading] = useState(true)
  const userId = getUserId()

  useEffect(() => {
    if (!ticketIds.length || !userId || !scheduleId) {
      navigate('/')
      return
    }

    Promise.all([
      userTicketsApi.list(),
      schedulesApi.getById(scheduleId),
    ])
      .then(([all, sched]) => {
        const mine = all.filter((ut) => ticketIds.includes(ut.ticketId) && ut.userId === userId)
        setPurchases(mine)
        setSchedule(sched)
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stage flex items-center justify-center">
        <p className="text-white/50 text-sm uppercase tracking-widest">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stage text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <div className="text-5xl mb-4"></div>
          <h1 className="text-3xl font-bold uppercase tracking-wide text-[#f5c518]">
            Booking Confirmed!
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
                <span className="text-[#f5c518] font-bold">${p.price.toFixed(2)}</span>
              </div>
              <p className="mt-2 text-xs font-mono text-white/40 tracking-widest">
                #{p.confirmationCode}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-white/40">
          Save your confirmation codes above. You can also view your tickets in your profile.
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
