import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('ErrorBoundary caught:', error, info)
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback

			return (
				<div className="min-h-screen bg-stage flex items-center justify-center p-8">
					<div className="text-center max-w-md">
						<h2 className="text-2xl font-bold text-gold mb-3">Something went wrong</h2>
						<p className="text-white/60 text-sm mb-6">
							{this.state.error?.message ?? 'An unexpected error occurred.'}
						</p>
						<button
							onClick={() => this.setState({ hasError: false, error: null })}
							className="px-6 py-2 bg-gold text-stage text-sm font-medium rounded-lg hover:bg-gold/90 transition-colors"
						>
							Try again
						</button>
					</div>
				</div>
			)
		}

		return this.props.children
	}
}
