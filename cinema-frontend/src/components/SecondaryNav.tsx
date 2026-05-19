import { Link } from "react-router-dom";
export default function SecondaryNav() {
  return (
    <div className="w-screen pt-1">
      <div className="flex w-full items-center justify-center gap-10 bg-wine/60 px-6 py-2 text-xs uppercase tracking-widest text-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <Link to="/schedule" className="hover:text-white transition-colors">Schedule</Link>
        <Link to="/movies" className="hover:text-white transition-colors">Movies</Link>
      </div>
    </div>
  )
}