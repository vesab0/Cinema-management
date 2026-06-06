import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type NavItem = { label: string; to: string; disabled?: boolean; icon: React.ReactNode; adminOnly?: boolean; end?: boolean };

const links: NavItem[] = [
  {
    label: "Users",
    to: "/dashboard",
    end: true,
    adminOnly: true,
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M16 19h4a1 1 0 0 0 1-1v-1a3 3 0 0 0-3-3h-2m-2.236-4a3 3 0 1 0 0-4M3 18v-1a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Zm8-10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    ),
  },
  {
    label: "Movies",
    to: "/dashboard/movies",
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v14M9 5v14M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    ),
  },
  {
    label: "Rooms",
    to: "/dashboard/rooms",
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21h18M3 7v1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7m0 1a3 3 0 0 0 6 0V7H3l2-4h14l2 4M5 21V10.85M19 21V10.85" />
    ),
  },
  {
    label: "Schedules",
    to: "/dashboard/schedules",
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 5h16M9 10v6m0 0H7m2 0h2" />
    ),
  },
  {
    label: "Financials",
    to: "/dashboard/user-tickets",
    adminOnly: true,
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17.345a4.76 4.76 0 0 0 2.558 1.618c2.274.589 4.512-.446 4.999-2.31.487-1.866-1.273-3.9-3.546-4.49-2.273-.59-4.034-2.623-3.547-4.488.486-1.865 2.724-2.899 4.998-2.31.982.236 1.87.8 2.322 1.584m-3.36 13.19V21m0-18v2.069" />
    ),
  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const isAdmin = user?.roles.map(r => r.toLowerCase()).includes('admin') ?? false;

  const visibleLinks = links.filter(link => !link.adminOnly || isAdmin);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        type="button"
        className="fixed top-3 left-3 z-50 inline-flex sm:hidden items-center justify-center p-2 bg-wine-dark text-white"
      >
        <span className="sr-only">Open sidebar</span>
        <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h10" />
        </svg>
      </button>

      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-full bg-[#300000] transition-transform sm:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-5 bg-black/20">
          <span className="text-white font-semibold text-lg tracking-tight">{isAdmin ? 'Admin' : 'Staff'}</span>
          <Link
            to="/"
            className="flex items-center gap-1 text-white/50 hover:text-white/90 transition-colors text-xs"
            title="Back to site"
          >
            <svg className="w-3.5 h-3.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
        </div>

        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {visibleLinks.map(({ label, to, disabled, icon, end }) => (
              <li key={label}>
                {disabled ? (
                  <span className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-white/30 cursor-not-allowed select-none">
                    <svg className="w-5 h-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      {icon}
                    </svg>
                    {label}
                    <span className="ml-auto text-[10px] font-semibold tracking-wider uppercase bg-gold/20 text-gold px-1.5 py-0.5">Soon</span>
                  </span>
                ) : (
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/15 text-white"
                          : "text-white/60 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <svg className="w-5 h-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                      {icon}
                    </svg>
                    {label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}