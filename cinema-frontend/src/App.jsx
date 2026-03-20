import { Link, Route, Routes } from 'react-router-dom'
import Index from '../pages/index.tsx'
import RegisterForms from '../components/RegisterForms.tsx'
import Navbar from '../components/Navbar.tsx'


function App() {
  return (
    <div className="min-h-screen bg-stage">

      <Navbar />

      <main className="w-full">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/register" element={<RegisterForms />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
