import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { stripeApi, userTicketsApi, ticketsApi, schedulesApi } from '../api'
import { useAuthStore } from '../store/authStore'
import type { TicketRow, ScheduleRow } from '../types'

const stripePromise = loadStripe("pk_test_51TZD9S3fbY4KMsAO7TAU6D0V66zRIZleCFfbkQuBrGVmURRvDY8ZlAT36b6Bb6SyKuqt2CAnRXUCxdG4PhqTdj9Z00gARYbIR6")

const CARD_STYLE = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      fontSmoothing: 'antialiased',
      '::placeholder': { color: 'rgba(255,255,255,0.2)' },
    },
    invalid: { color: '#ff6b6b' },
  },
}

export default function PaymentPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const [ticketIds] = useState<string[]>(() => {
    const fromState = (location.state as { ticketIds: string[] } | null)?.ticketIds
    if (fromState?.length) return fromState
    try {
      const pending = JSON.parse(sessionStorage.getItem('pendingBooking') ?? 'null')
      if (pending?.ticketIds?.length) {
        sessionStorage.removeItem('pendingBooking')
        return pending.ticketIds
      }
    } catch {}
    return []
  })
  const userId = useAuthStore((s) => s.user?.id ?? null)

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [schedule, setSchedule] = useState<ScheduleRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ticketIds.length || !userId || !scheduleId) { navigate('/'); return }

    Promise.all([
      stripeApi.createMultiPaymentIntent({ ticketIds, userId }),
      ticketsApi.getBySchedule(scheduleId),
      schedulesApi.getById(scheduleId),
    ])
      .then(([intent, tkts, sched]) => {
        setClientSecret(intent.clientSecret)
        setPaymentIntentId(intent.paymentIntentId)
        setTickets(tkts.filter((t) => ticketIds.includes(t.id)))
        setSchedule(sched)
      })
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to initialize payment.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#f5c518] border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-xs uppercase tracking-[0.3em]">Preparing payment...</p>
      </div>
    </div>
  )

  if (error || !clientSecret) return (
    <div className="min-h-[80vh] flex items-center justify-center flex-col gap-4">
      <p className="text-red-400 text-sm">{error ?? 'Could not load payment.'}</p>
      <button onClick={() => navigate(-1)} className="text-white/40 text-xs hover:text-white transition-colors">← Go back</button>
    </div>
  )

  const totalPrice = tickets.reduce((s, t) => s + t.price, 0)

  return (
    <div className="min-h-screen bg-stage text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <button
          onClick={() => navigate(-1)}
          className="text-white/40 text-xs uppercase tracking-widest hover:text-white transition-colors mb-8 flex items-center gap-2"
        >
          <span>←</span> Back to seats
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <h1 className="text-2xl font-bold uppercase tracking-wide mb-8">Payment Details</h1>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CardForm
                clientSecret={clientSecret}
                paymentIntentId={paymentIntentId!}
                ticketIds={ticketIds}
                userId={userId!}
                scheduleId={scheduleId!}
              />
            </Elements>
          </div>

          <div className="lg:col-span-2 lg:mt-[72px]">
            <div className="bg-[#141414] border border-white/10 rounded p-6 sticky top-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-4">Order Summary</p>

              {schedule && (
                <div className="mb-4">
                  <p className="font-bold text-[#f5c518] text-sm">{schedule.movieName}</p>
                  <p className="text-white/50 text-xs mt-0.5">{schedule.roomName}</p>
                  <p className="text-white text-sm mt-1 font-semibold">
                    {formatDay(schedule.scheduleDay)} · {schedule.startTime}
                  </p>
                </div>
              )}

              <div className="border-t border-white/10 my-4" />

              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-sm bg-white/10 text-xs font-bold flex items-center justify-center text-white/70">
                        {t.rowLabel}{t.colNumber}
                      </span>
                      <span className="text-sm text-white/60">
                        {t.seatType !== 'Standard'
                          ? <span className="text-[#f5c518]">{t.seatType}</span>
                          : 'Standard'}
                      </span>
                    </div>
                    <span className="text-sm font-mono text-white/80">${t.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 mt-4 pt-4 flex justify-between items-center">
                <span className="text-sm text-white/50">Total</span>
                <span className="text-2xl font-bold text-[#f5c518]">${totalPrice.toFixed(2)}</span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-white/25 text-xs">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Secured by Stripe
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CardForm({
  clientSecret,
  paymentIntentId,
  ticketIds,
  userId,
  scheduleId,
}: {
  clientSecret: string
  paymentIntentId: string
  ticketIds: string[]
  userId: string
  scheduleId: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardholderName, setCardholderName] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError(null)

    const cardEl = elements.getElement(CardNumberElement)
    if (!cardEl) { setSubmitting(false); return }

    const { error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardEl,
        billing_details: { name: cardholderName || undefined },
      },
    })

    if (stripeError) {
      setError(stripeError.message ?? 'Payment failed.')
      setSubmitting(false)
      return
    }

    try {
      const purchases = await userTicketsApi.purchaseMulti({ userId, ticketIds, paymentIntentId })
      navigate(`/booking/${scheduleId}/confirmation`, {
        state: { purchases },
        replace: true,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.detail
        ?? err?.response?.data?.title
        ?? `Booking failed (${err?.response?.status ?? 'network error'}). Contact support.`
      setError(msg)
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          placeholder="Name on card"
          className="w-full bg-[#141414] border border-white/15 rounded-sm px-4 py-3.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#f5c518]/50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
          Card Number
        </label>
        <div className="bg-[#141414] border border-white/15 rounded-sm px-4 py-4 focus-within:border-[#f5c518]/50 transition-colors">
          <CardNumberElement options={CARD_STYLE} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
            Expiry Date
          </label>
          <div className="bg-[#141414] border border-white/15 rounded-sm px-4 py-4 focus-within:border-[#f5c518]/50 transition-colors">
            <CardExpiryElement options={CARD_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">
            CVC
          </label>
          <div className="bg-[#141414] border border-white/15 rounded-sm px-4 py-4 focus-within:border-[#f5c518]/50 transition-colors">
            <CardCvcElement options={CARD_STYLE} />
          </div>
        </div>
      </div>

      <p className="text-xs text-white/25">
        Test: <span className="font-mono">4242 4242 4242 4242</span> · any future date · any CVC
      </p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe || !elements}
        className="w-full py-4 rounded text-sm uppercase tracking-widest font-bold transition-all
          disabled:opacity-30 disabled:cursor-not-allowed
          bg-[#f5c518] text-black hover:bg-[#e6b800] hover:scale-[1.01] active:scale-100"
      >
        {submitting
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          : 'Pay Now'}
      </button>
    </form>
  )
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
