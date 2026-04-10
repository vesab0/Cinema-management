export default function SecondaryNav() {
  return (
    <div className="w-screen pt-1">
      <div className="flex w-full items-center justify-center gap-10 bg-wine/60 px-6 py-2 text-xs uppercase tracking-widest text-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        
        <a className="hover:text-white transition-colors">Home</a>
        <a className="hover:text-white transition-colors">Schedule</a>
        <a className="hover:text-white transition-colors">Movies</a>

      </div>
    </div>
  )
}