import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/footer'
import ErrorBoundary from './components/ErrorBoundary'
import AdminRoute from './AdminRoute'
import { bootstrapSession } from './auth'
import CookieBanner from './components/Cookiebanner'

// Eagerly loaded (public, always needed)
import Index from './pages/index'
import AuthPage from './pages/AuthPage'

// Lazily loaded (heavy or infrequently visited)
const MovieDetailsPage = lazy(() => import('./pages/moviedetails'))
const SeatSelectionPage = lazy(() => import('./pages/seatselection'))
const PaymentPage = lazy(() => import('./pages/paymentpage'))
const ConfirmationPage = lazy(() => import('./pages/confirmationpage'))
const ProfilePage = lazy(() => import('./pages/profile'))
const NotFound = lazy(() => import('./components/NotFound'))
const MoviesPage = lazy(() => import('./pages/moviespage'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))

// Dashboard pages (admin-only, always lazy)
const Dashboard = lazy(() => import('./pages/dashboard/dashboard'))
const Users = lazy(() => import('./pages/dashboard/users'))
const Movies = lazy(() => import('./pages/dashboard/movies'))
const Rooms = lazy(() => import('./pages/dashboard/rooms'))
const Schedules = lazy(() => import('./pages/dashboard/schedule'))
const UserTickets = lazy(() => import('./pages/dashboard/user-tickets'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))

function PublicLayout() {
  return (
    <div className="min-h-screen bg-stage">
      <Navbar />
      <main className="w-full">
        <Outlet />
      </main>
      <Footer />
        <CookieBanner />
    </div>
  )
}

function ScrollToTop() {
  const { pathname, search } = useLocation()

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}

function PageSpinner() {
  return (
    <div className="min-h-screen bg-stage text-white flex items-center justify-center">
      <p className="text-sm uppercase tracking-[0.35em] text-gold/70">Loading...</p>
    </div>
  )
}

export default function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    bootstrapSession().finally(() => setIsReady(true))
  }, [])

  if (!isReady) {
    return (
      <div className="min-h-screen bg-stage text-white flex items-center justify-center">
        <p className="text-sm uppercase tracking-[0.35em] text-gold/70">
          Restoring session...
        </p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSpinner />}>
        <ScrollToTop />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/movies" element={<MoviesPage mode="now-playing" />} />
            <Route path="/upcoming" element={<MoviesPage mode="upcoming" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/movies/:id" element={<MovieDetailsPage />} />
            <Route path="/booking/:scheduleId" element={<SeatSelectionPage />} />
            <Route path="/booking/:scheduleId/payment" element={<PaymentPage />} />
            <Route path="/booking/:scheduleId/confirmation" element={<ConfirmationPage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="/dashboard" element={<Dashboard />}>
              <Route index element={<Users />} />
              <Route path="movies" element={<Movies />} />
              <Route path="rooms" element={<Rooms />} />
              <Route path="schedules" element={<Schedules />} />
              <Route path="user-tickets" element={<UserTickets />} />
            </Route>
          </Route>
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
