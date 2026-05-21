import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-wine px-6 py-10">
      <div className="mx-auto max-w-5xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Logo" className="h-10" />
          <span className="text-xl font-bold text-gold">Twin Peaks</span>
        </Link>

        <div className="flex flex-col gap-1.5 text-sm text-gold/80">
          <Link to="/" className="hover:text-gold transition-colors">Home</Link>
          <Link to="/schedule" className="hover:text-gold transition-colors">Upcoming</Link>
          <Link to="/movies" className="hover:text-gold transition-colors">Now Playing</Link>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-gold/80">
          <Link to="/privacy" className="hover:text-gold transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-gold transition-colors">Terms of Service</Link>
        </div>

      </div>

      <div className="mx-auto max-w-5xl mt-8 pt-6 border-t border-gold/20 text-xs text-gold/40 text-center">
        © {new Date().getFullYear()} Twin Peaks Cinema. All rights reserved.
      </div>
    </footer>
  )
}