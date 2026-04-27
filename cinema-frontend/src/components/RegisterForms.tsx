import { isAxiosError } from 'axios'
import { useState, type FormEvent, type MouseEvent } from 'react'
import { authApi } from '../api'

export default function RegisterForms() {
	const [isCreateMode, setIsCreateMode] = useState(false)
	const [firstName, setFirstName] = useState('')
	const [lastName, setLastName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [errorMessage, setErrorMessage] = useState('')
	const [successMessage, setSuccessMessage] = useState('')

	const resetMessages = () => {
		setErrorMessage('')
		setSuccessMessage('')
	}

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		resetMessages()

		if (!email.trim() || !password.trim()) {
			setErrorMessage('Email and password are required.')
			return
		}

		if (isCreateMode && (!firstName.trim() || !lastName.trim())) {
			setErrorMessage('First name and last name are required for account creation.')
			return
		}

		setIsSubmitting(true)
		try {
			if (isCreateMode) {
				await authApi.register({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
					email: email.trim(),
					password,
				})

				setSuccessMessage('Account created successfully. You can sign in now.')
				setIsCreateMode(false)
				setPassword('')
			} else {
				const response = await authApi.login({
					email: email.trim(),
					password,
				})

				const accessToken = response?.data?.accessToken
				const refreshToken = response?.data?.refreshToken
				if (accessToken) localStorage.setItem('accessToken', accessToken)
				if (refreshToken) localStorage.setItem('refreshToken', refreshToken)

				setSuccessMessage('Signed in successfully.')
			}
        } catch (error: unknown) {
            const apiMessage = isAxiosError(error)
                ? error.response?.data?.message || error.response?.data?.error || error.response?.data?.detail || error.response?.data?.title
                : ''
			setErrorMessage(apiMessage || 'Request failed. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

    const toggleMode = (event: MouseEvent<HTMLAnchorElement>) => {
		event.preventDefault()
		setIsCreateMode((current) => !current)
		setPassword('')
		resetMessages()
	}

	return (
        <div className="w-full max-w-sm p-6 m-auto mx-auto bg-wine rounded-lg shadow-md border border-gold/30">
            <div className="flex justify-center mx-auto">
                <img className="w-auto h-7 sm:h-8" src="/logo.png" alt="Logo" />
            </div>

            <form className="mt-6" onSubmit={handleSubmit}>
                {isCreateMode && (
                    <>
                        <div>
                            <label htmlFor="firstName" className="block text-sm text-gold">First Name</label>
                            <input
                                id="firstName"
                                type="text"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                className="block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring"
                            />
                        </div>

                        <div className="mt-4">
                            <label htmlFor="lastName" className="block text-sm text-gold">Last Name</label>
                            <input
                                id="lastName"
                                type="text"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                className="block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring"
                            />
                        </div>
                    </>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm text-gold">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring"
                    />
                </div>

                <div className="mt-4">
                    <div className="flex items-center justify-between">
                        <label htmlFor="password" className="block text-sm text-gold">Password</label>
                        {!isCreateMode && <a href="#" className="text-xs text-gold/80 hover:text-gold hover:underline">Forget Password?</a>}
                    </div>

                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="block w-full px-4 py-2 mt-2 text-gold bg-stage border border-gold/30 rounded-lg focus:border-gold focus:ring-gold/40 focus:outline-none focus:ring"
                    />
                </div>

                {errorMessage && (
                    <p className="mt-4 text-xs text-red-300">{errorMessage}</p>
                )}

                {successMessage && (
                    <p className="mt-4 text-xs text-gold">{successMessage}</p>
                )}

                <div className="mt-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full px-6 py-2.5 text-sm font-medium tracking-wide text-stage capitalize transition-colors duration-300 transform bg-gold rounded-lg hover:bg-gold/90 focus:outline-none focus:ring focus:ring-gold/40 disabled:opacity-60"
                    >
                        {isSubmitting ? 'Please wait...' : isCreateMode ? 'Create Account' : 'Sign In'}
                    </button>
                </div>
            </form>

            <div className="flex items-center justify-between mt-4">
                <span className="w-1/5 border-b border-gold/30 lg:w-1/5"></span>

                <a href="#" className="text-xs text-center text-gold/70 uppercase">
                    or login with
                </a>

                <span className="w-1/5 border-b border-gold/30 lg:w-1/5"></span>
            </div>

            <div className="flex items-center mt-6 -mx-2">
                <button type="button" className="flex items-center justify-center w-full px-6 py-2 mx-2 text-sm font-medium text-gold transition-colors duration-300 transform bg-stage border border-gold/40 rounded-lg hover:bg-stage/80 focus:bg-stage/80 focus:outline-none">
                    <svg className="w-4 h-4 mx-2 fill-current" viewBox="0 0 24 24">
                        <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"></path>
                    </svg>

                    <span className="hidden mx-2 sm:inline">Sign in with Google</span>
                </button>

            </div>

            <p className="mt-8 text-xs font-light text-center text-gold/70">
                {isCreateMode ? 'Already have an account? ' : 'Don\'t have an account? '}
                <a href="#" onClick={toggleMode} className="font-medium text-gold hover:underline">
                    {isCreateMode ? 'Sign In' : 'Create One'}
                </a>
            </p>
        </div>
    )
}
