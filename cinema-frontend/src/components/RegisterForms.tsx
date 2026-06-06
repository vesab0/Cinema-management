import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { authApi } from '../api'
import {
	loginSchema,
	registerSchema,
	type LoginFormData,
	type RegisterFormData,
} from '../schemas/auth'

type Mode = 'login' | 'register' | 'forgot'

interface RegisterFormsProps {
	initialMode?: Mode
	onLoginSuccess?: () => void
}

const inputClass =
	'block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring'
const errorClass = 'mt-1 text-xs text-red-300'

export default function RegisterForms({ initialMode = 'login', onLoginSuccess }: RegisterFormsProps) {
	const [mode, setMode] = useState<Mode>(initialMode)
	const [serverError, setServerError] = useState('')
	const [successMessage, setSuccessMessage] = useState('')
	const [forgotEmail, setForgotEmail] = useState('')
	const [isSendingReset, setIsSendingReset] = useState(false)

	const loginForm = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })
	const registerForm = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) })

	const activeForm = mode === 'register' ? registerForm : loginForm
	const isSubmitting = activeForm.formState.isSubmitting

	const googleLogin = useGoogleLogin({
		onSuccess: async (tokenResponse) => {
			setServerError('')
			try {
				await authApi.googleLogin(tokenResponse.access_token)
				onLoginSuccess?.()
			} catch (error: unknown) {
				setServerError(extractApiError(error) || 'Google sign-in failed. Please try again.')
			}
		},
		onError: () => setServerError('Google sign-in failed. Please try again.'),
	})

	const switchMode = (to: Mode) => (e: React.MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault()
		setMode(to)
		setServerError('')
		setSuccessMessage('')
		loginForm.reset()
		registerForm.reset()
	}

	const onLogin = loginForm.handleSubmit(async (data) => {
		setServerError('')
		try {
			await authApi.login(data)
			onLoginSuccess?.()
		} catch (error) {
			setServerError(extractApiError(error) || 'Sign in failed. Please try again.')
		}
	})

	const onRegister = registerForm.handleSubmit(async (data) => {
		setServerError('')
		try {
			await authApi.register(data)
			setSuccessMessage('Account created! You can sign in now.')
			await authApi.login({ email: data.email, password: data.password })
        	onLoginSuccess?.()
		} catch (error: unknown) {
			setServerError(extractApiError(error) || 'Registration failed. Please try again.')
		}
	})

	const onForgotPassword = async (e: React.FormEvent) => {
		e.preventDefault()
		setServerError('')
		setIsSendingReset(true)
		try {
			await authApi.forgotPassword(forgotEmail)
			setSuccessMessage('If that email is registered, a reset link has been sent.')
		} catch {
			setServerError('Something went wrong. Please try again.')
		} finally {
			setIsSendingReset(false)
		}
	}

	return (
		<div className="w-full max-w-sm p-6 m-auto mx-auto bg-wine rounded-lg shadow-md border border-gold/30">
			<div className="flex justify-center mx-auto">
				<img className="w-auto h-7 sm:h-8" src="/logo.png" alt="Logo" />
			</div>

			<h2 className="mt-4 text-center text-gold font-semibold text-lg">
				{mode === 'login' && 'Welcome Back'}
				{mode === 'register' && 'Create Account'}
				{mode === 'forgot' && 'Reset Password'}
			</h2>

			{mode === 'forgot' ? (
				<form className="mt-6" onSubmit={onForgotPassword} noValidate>
					<p className="text-xs text-gold/70 mb-4">
						Enter your email and we'll send you a link to reset your password.
					</p>
					<div>
						<label htmlFor="forgot-email" className="block text-sm text-gold">Email</label>
						<input
							id="forgot-email"
							type="email"
							className={inputClass}
							value={forgotEmail}
							onChange={(e) => setForgotEmail(e.target.value)}
							required
						/>
					</div>
					{serverError && <p className="mt-3 text-xs text-red-300">{serverError}</p>}
					{successMessage && <p className="mt-3 text-xs text-green-300">{successMessage}</p>}
					<div className="mt-6">
						<button
							type="submit"
							disabled={isSendingReset}
							className="w-full px-6 py-2.5 text-sm font-medium tracking-wide text-stage capitalize transition-colors duration-300 transform bg-gold rounded-lg hover:bg-gold/90 focus:outline-none focus:ring focus:ring-gold/40 disabled:opacity-60"
						>
							{isSendingReset ? 'Sending...' : 'Send Reset Link'}
						</button>
					</div>
					<p className="mt-6 text-xs font-light text-center text-gold/70">
						Remember it?{' '}
						<a href="#" onClick={switchMode('login')} className="font-medium text-gold hover:underline">
							Sign In
						</a>
					</p>
				</form>
			) : (
				<form
					className="mt-6"
					onSubmit={mode === 'register' ? onRegister : onLogin}
					noValidate
				>
					{mode === 'register' && (
						<>
							<div>
								<label htmlFor="firstName" className="block text-sm text-gold">First Name</label>
								<input id="firstName" type="text" className={inputClass} {...registerForm.register('firstName')} />
								{registerForm.formState.errors.firstName && (
									<p className={errorClass}>{registerForm.formState.errors.firstName.message}</p>
								)}
							</div>
							<div className="mt-4">
								<label htmlFor="lastName" className="block text-sm text-gold">Last Name</label>
								<input id="lastName" type="text" className={inputClass} {...registerForm.register('lastName')} />
								{registerForm.formState.errors.lastName && (
									<p className={errorClass}>{registerForm.formState.errors.lastName.message}</p>
								)}
							</div>
						</>
					)}

					<div className={mode === 'register' ? 'mt-4' : ''}>
						<label htmlFor="email" className="block text-sm text-gold">Email</label>
						<input
							id="email"
							type="email"
							className={inputClass}
							{...(mode === 'register' ? registerForm.register('email') : loginForm.register('email'))}
						/>
						{mode === 'register'
							? registerForm.formState.errors.email && <p className={errorClass}>{registerForm.formState.errors.email.message}</p>
							: loginForm.formState.errors.email && <p className={errorClass}>{loginForm.formState.errors.email.message}</p>}
					</div>

					<div className="mt-4">
						<div className="flex items-center justify-between">
							<label htmlFor="password" className="block text-sm text-gold">Password</label>
							{mode === 'login' && (
								<a href="#" onClick={switchMode('forgot')} className="text-xs text-gold/80 hover:text-gold hover:underline">
									Forgot Password?
								</a>
							)}
						</div>
						<input
							id="password"
							type="password"
							className={inputClass}
							{...(mode === 'register' ? registerForm.register('password') : loginForm.register('password'))}
						/>
						{mode === 'register'
							? registerForm.formState.errors.password && <p className={errorClass}>{registerForm.formState.errors.password.message}</p>
							: loginForm.formState.errors.password && <p className={errorClass}>{loginForm.formState.errors.password.message}</p>}
					</div>

					{serverError && <p className="mt-3 text-xs text-red-300">{serverError}</p>}
					{successMessage && <p className="mt-3 text-xs text-green-300">{successMessage}</p>}

					<div className="mt-6">
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full px-6 py-2.5 text-sm font-medium tracking-wide text-stage capitalize transition-colors duration-300 transform bg-gold rounded-lg hover:bg-gold/90 focus:outline-none focus:ring focus:ring-gold/40 disabled:opacity-60"
						>
							{isSubmitting ? 'Please wait...' : mode === 'register' ? 'Create Account' : 'Sign In'}
						</button>
					</div>
				</form>
			)}

			{mode !== 'forgot' && (
				<>
					<div className="flex items-center justify-between mt-4">
						<span className="w-1/5 border-b border-gold/30" />
						<span className="text-xs text-center text-gold/70 uppercase">or</span>
						<span className="w-1/5 border-b border-gold/30" />
					</div>

					<div className="flex items-center mt-4 -mx-2">
						<button
							type="button"
							onClick={() => googleLogin()}
							className="flex items-center justify-center w-full px-6 py-2 mx-2 text-sm font-medium text-gold transition-colors duration-300 transform bg-stage border border-gold/40 rounded-lg hover:bg-stage/80 focus:outline-none"
						>
							<svg className="w-4 h-4 mx-2 fill-current" viewBox="0 0 24 24">
								<path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
							</svg>
							<span className="hidden mx-2 sm:inline">Sign in with Google</span>
						</button>
					</div>

					<p className="mt-6 text-xs font-light text-center text-gold/70">
						{mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
						<a href="#" onClick={switchMode(mode === 'register' ? 'login' : 'register')} className="font-medium text-gold hover:underline">
							{mode === 'register' ? 'Sign In' : 'Create One'}
						</a>
					</p>
				</>
			)}
		</div>
	)
}

function extractApiError(error: unknown): string {
	if (!isAxiosError(error)) return ''
	const d = error.response?.data
	return d?.message || d?.error || d?.detail || d?.title || ''
}