import { useEffect, useState } from 'react'
import { Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Index from './pages/index'
import Dashboard from './pages/dashboard/dashboard'
import Users from './pages/dashboard/users'
import Movies from './pages/dashboard/movies'
import Rooms from './pages/dashboard/rooms'
import Schedules from './pages/dashboard/schedule'
import RegisterForms from './components/RegisterForms'
import AdminRoute from './AdminRoute'
import ProfilePage from './pages/profile'
import MoviesPage from './pages/moviespage'
import MovieDetailsPage from './pages/moviedetails'
import NotFound from './components/NotFound'
import UserTickets from './pages/dashboard/user-tickets'
import { bootstrapSession } from './auth'

function PublicLayout() {
  return (
    <div className="min-h-screen bg-stage">
      <Navbar />
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        await bootstrapSession()
      } finally {
        setIsReady(true)
      }
    }

    init()
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
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/register" element={<RegisterForms />} />
        <Route path="/movies" element={<MoviesPage mode="now-playing" />} />
        <Route path="/upcoming" element={<MoviesPage mode="upcoming" />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/movies/:id" element={<MovieDetailsPage />} /> 
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
      <Route path="*" element={<NotFound/>} />
    </Routes>
  )
}