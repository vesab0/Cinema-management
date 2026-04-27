import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-stage">
      <Sidebar />
      <main className="ml-64 min-h-screen bg-gray-100">
        <Outlet />
      </main>
    </div>
  )
}
