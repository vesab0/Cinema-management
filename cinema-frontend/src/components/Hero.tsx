import { Button } from "@/components/ui/button"

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-black text-white">
      <div className="absolute inset-0">
        <img
          src="/hero.png"
          alt="Cinema background"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <div className="relative z-10 flex min-h-[65vh] sm:min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 py-10 text-center">

        <div className="mb-6 flex items-center gap-3 text-sm sm:text-sm text-yellow-400">
          <div className="h-px w-12 sm:w-60 bg-yellow-400/70" />
          <span className="tracking-wide whitespace-nowrap">Prishtine 1998</span>
        </div>

        <h1 className="font-display text-7xl tracking-tight sm:text-6xl md:text-8xl lg:text-[10rem]">
          TWIN PEAKS
        </h1>

        <p className="mt-3 text-base sm:text-sm font-medium uppercase tracking-widest text-yellow-400">
          Cinema & Experience
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <Button variant="schedule" size="lg" className="h-10 px-5 text-sm sm:h-14 sm:px-8 sm:text-base">
            View Schedule
          </Button>

          <Button variant="nowPlaying" size="lg" className="h-10 px-5 text-sm sm:h-14 sm:px-8 sm:text-base">
            Now Playing
          </Button>
        </div>

        <p className="mt-5 max-w-xs px-2 text-xs text-white/70 sm:max-w-md sm:text-sm sm:text-base">
          Located in the heart of Prishtina, Twin Peaks Cinema brings the world's finest films to you.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-white/50 uppercase tracking-widest sm:gap-x-8">
          <span>5 Screening Halls</span>
          <span className="text-gold/50">·</span>
          <span>IMAX</span>
          <span className="text-gold/50">·</span>
          <span>Laser Projection</span>
          <span className="text-gold/50">·</span>
          <span>Dolby Atmos</span>
        </div>

        <div className="mt-10 sm:mt-20 h-px w-full max-w-xl bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />

      </div>
    </section>
  )
}
