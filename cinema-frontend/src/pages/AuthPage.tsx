import { useSearchParams, useNavigate } from 'react-router-dom'
import RegisterForms from '../components/RegisterForms'

export default function AuthPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const redirect = searchParams.get('redirect') || '/'
  const reason = searchParams.get('reason')

  const handleSuccess = () => {
    navigate(redirect, { replace: true })
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-stage flex flex-col items-center justify-center py-16 px-4">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-wine/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {reason === 'booking' && (
          <p className="mb-5 text-center text-sm text-white/50">Sign in to complete your purchase.</p>
        )}

        <RegisterForms initialMode="login" onLoginSuccess={handleSuccess} />
      </div>
    </div>
  )
}
