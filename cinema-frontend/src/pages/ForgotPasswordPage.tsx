import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { authApi } from '../api'

const inputClass =
  'block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim())
      setSubmitted(true)
    } catch (err) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.message || 'Something went wrong. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stage flex items-center justify-center px-4">
      <div className="w-full max-w-sm p-6 bg-wine rounded-lg shadow-md border border-gold/30">
        <div className="flex justify-center">
          <img className="w-auto h-7 sm:h-8" src="/logo.png" alt="Logo" />
        </div>
        <h2 className="mt-4 text-center text-gold font-semibold text-lg">Forgot Password</h2>

        {submitted ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-gold/80">
              If that email is registered, a reset link is on its way. Check your inbox.
            </p>
            <Link
              to="/"
              className="mt-6 inline-block text-xs text-gold/50 hover:text-gold transition-colors"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <form className="mt-6" onSubmit={handleSubmit} noValidate>
            <div>
              <label className="block text-sm text-gold">Email address</label>
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full px-6 py-2.5 text-sm font-medium tracking-wide text-stage capitalize transition-colors duration-300 transform bg-gold rounded-lg hover:bg-gold/90 focus:outline-none focus:ring focus:ring-gold/40 disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gold/50">
              Remembered it?{' '}
              <Link to="/" className="text-gold/80 hover:text-gold transition-colors">
                Back to home
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}