import { Link, Route, Routes } from 'react-router-dom'
import TestPage from '../pages/test.tsx'
import RegisterForms from '../components/RegisterForms.tsx'

function HomePage() {
  return <h1 className="text-3xl font-semibold text-gold">Cinema Frontend</h1>
}

function App() {
  return (
    <div className="min-h-screen bg-stage text-gold">
      <nav className="flex gap-4 p-4 border-b border-gold/30 bg-wine">
        <Link className="hover:underline" to="/">Home</Link>
        <Link className="hover:underline" to="/test">Test</Link>
        <Link className="hover:underline" to="/register">Register</Link>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/register" element={<RegisterForms />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
