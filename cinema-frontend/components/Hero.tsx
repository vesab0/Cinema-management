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

      <div className="relative z-10 flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 py-10 text-center">

        <div className="mb-6 flex items-center gap-4 text-sm text-yellow-400">
          <div className="h-px w-60 bg-yellow-400/70" />
          <span className="tracking-wide">Prishtine 1998</span>
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl md:text-8xl lg:text-[10rem]">
          TWIN PEAKS
        </h1>

        <p className="mt-4 text-lg font-medium uppercase tracking-widest text-yellow-400">
          Cinema & Experience
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <Button variant="schedule" size="lg">
            View Schedule
          </Button>

          <Button variant="nowPlaying" size="lg">
            Now Playing
          </Button>
        </div>

        <p className="mt-8 max-w-md text-sm text-white/70 sm:text-base">
          Located in the heart of Prishtina, Twin Peaks Cinema brings the world’s finest films to you.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60 sm:gap-6">
          <span>5 Screening Halls</span>
          <span className="text-yellow-400">|</span>
          <span className="text-white">IMAX</span>
          <span className="text-white/60">Laser Projection</span>
          <span className="text-yellow-400">|</span>
          <span className="text-white">DOLBY</span>
          <span className="text-white/60">Atmos Sound</span>
        </div>

        <div className="mt-20 h-px w-full max-w-xl bg-gradient-to-r from-transparent via-gold to-transparent opacity-80" />

      </div>
    </section>
  )
}
