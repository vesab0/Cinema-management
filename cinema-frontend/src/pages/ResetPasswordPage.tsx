import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { authApi } from '../api'

const inputClass =
	'block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring'

export default function ResetPasswordPage() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const token = searchParams.get('token') ?? ''
	const email = searchParams.get('email') ?? ''

	const [newPassword, setNewPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const isInvalidLink = !token || !email

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		if (newPassword.length < 8) {
			setError('Password must be at least 8 characters.')
			return
		}
		if (newPassword !== confirm) {
			setError('Passwords do not match.')
			return
		}

		setLoading(true)
		try {
			await authApi.resetPassword(email, token, newPassword)
			navigate('/', { state: { resetSuccess: true } })
		} catch (err) {
			if (isAxiosError(err)) {
				setError(err.response?.data?.message || 'Reset failed. The link may have expired.')
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
				<h2 className="mt-4 text-center text-gold font-semibold text-lg">Set New Password</h2>

				{isInvalidLink ? (
					<p className="mt-6 text-xs text-red-300 text-center">
						This reset link is invalid. Please request a new one.
					</p>
				) : (
					<form className="mt-6" onSubmit={handleSubmit} noValidate>
						<div>
							<label className="block text-sm text-gold">New Password</label>
							<input
								type="password"
								className={inputClass}
								value={newPassword}
								onChange={(e) => setNewPassword(e.target.value)}
								required
							/>
						</div>
						<div className="mt-4">
							<label className="block text-sm text-gold">Confirm Password</label>
							<input
								type="password"
								className={inputClass}
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								required
							/>
						</div>

						{error && <p className="mt-3 text-xs text-red-300">{error}</p>}

						<div className="mt-6">
							<button
								type="submit"
								disabled={loading}
								className="w-full px-6 py-2.5 text-sm font-medium tracking-wide text-stage capitalize transition-colors duration-300 transform bg-gold rounded-lg hover:bg-gold/90 focus:outline-none focus:ring focus:ring-gold/40 disabled:opacity-60"
							>
								{loading ? 'Saving...' : 'Reset Password'}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	)
}