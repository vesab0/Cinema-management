import { Outlet, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import Index from './pages/index'
import Dashboard from './pages/dashboard/dashboard'
import Users from './pages/dashboard/users'
import Movies from './pages/dashboard/movies'
import Rooms from './pages/dashboard/rooms'
import RegisterForms from './components/RegisterForms'
import AdminRoute from './AdminRoute'
import MoviesPage from './pages/moviespage'

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
  return (
    <Routes>

      <Route element={<PublicLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/register" element={<RegisterForms />} />
        <Route path="/movies" element={<MoviesPage />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Users />} />
          <Route path="movies" element={<Movies />} />
          <Route path="rooms" element={<Rooms />} />
        </Route>
      </Route>

    </Routes>
  )
}

