// App.tsx
import { Outlet, Route, Routes } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Index from '../pages/index'
import Dashboard from '../pages/dashboard/dashboard'
import Users from '../pages/dashboard/users'
import RegisterForms from '../components/RegisterForms'
import AdminRoute from './AdminRoute'

export default function App() {
  return (
    <Routes>

      <Route element={
        <div className="min-h-screen bg-stage">
          <Navbar />
          <main className="w-full">
            <Outlet />
          </main>
        </div>
      }>
        <Route path="/" element={<Index />} />
        <Route path="/register" element={<RegisterForms />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Users />} />
        </Route>
      </Route>

    </Routes>
  )
}