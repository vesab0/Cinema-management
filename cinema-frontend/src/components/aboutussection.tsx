export default function AboutSection() {
  return (
    <div className="w-full bg-black px-4 py-24 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center gap-4 mb-16">
          <div className="flex-1 h-px bg-yellow-400/30" />
          <span className="text-[11px] font-semibold tracking-[0.35em] text-yellow-400 uppercase">Who We Are</span>
          <div className="flex-1 h-px bg-yellow-400/30" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <p className="text-xs tracking-widest text-yellow-400 uppercase mb-4">Est. 1998 — Prishtina</p>
            <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">Unending Passion For Cinema And The Arts</h3>
            <p className="text-white/60 leading-relaxed">
              Twin Peaks opened its doors in 1998 with a single promise: to give Prishtina an experience worthy of the films it loved. Founded by cinephiles, for cinephiles, we chose this city because it deserved a stage as grand as any other in the world.
            </p>
          </div>
          <div>
            <p className="text-xs tracking-widest text-yellow-400 uppercase mb-4">How We Do What We Do</p>
            <h3 className="text-2xl font-semibold text-white mb-4 leading-snug">The Details That Bring Your Stories To You</h3>
            <p className="text-white/60 leading-relaxed">
              From our handpicked catalouge of films, to the acoustics of every hall, none of it is incidental. Our IMAX laser projection and Dolby Atmos sound mixing exist to bring you the frame you deserve!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}