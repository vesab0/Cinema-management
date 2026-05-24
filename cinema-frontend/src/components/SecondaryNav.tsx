import { Link, useLocation } from "react-router-dom";

export default function SecondaryNav() {
  const { pathname } = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/movies", label: "Now Playing" },
    { to: "/upcoming", label: "Upcoming" },
  ];

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <div className="w-full pt-1">
      <div className="flex w-full items-center justify-center gap-10 bg-wine/60 px-6 py-2 text-xs uppercase tracking-widest text-white/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        {links.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`relative py-1 transition-colors hover:text-white ${
              isActive(to) ? "text-gold" : ""
            }`}
          >
            {label}
            {isActive(to) && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-gold/70 rounded-full" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}