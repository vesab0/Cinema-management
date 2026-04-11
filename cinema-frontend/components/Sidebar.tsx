import { useState } from "react";
import { NavLink } from "react-router-dom";

const links = [
  {
    label: "Users",
    to: "/dashboard",
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
    label: "Scheduling",
    to: "/dashboard/scheduling",
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm0 5h16M9 10v6m0 0H7m2 0h2" />
    ),
  },
  {
    label: "Financials",
    to: "/dashboard/financials",
    icon: (
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 17.345a4.76 4.76 0 0 0 2.558 1.618c2.274.589 4.512-.446 4.999-2.31.487-1.866-1.273-3.9-3.546-4.49-2.273-.59-4.034-2.623-3.547-4.488.486-1.865 2.724-2.899 4.998-2.31.982.236 1.87.8 2.322 1.584m-3.36 13.19V21m0-18v2.069" />
    ),
  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        type="button"
        className="fixed top-3 left-3 z-50 inline-flex sm:hidden items-center justify-center p-2 rounded-lg bg-gray-900 text-white"
      >
        <span className="sr-only">Open sidebar</span>
        <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
          <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h10" />
        </svg>
      </button>

      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-full bg-gray-900 transition-transform sm:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center px-5 py-5 border-b border-gray-700">
          <span className="text-white font-semibold text-lg tracking-tight">Admin</span>
        </div>

        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {links.map(({ label, to, icon }) => (
              <li key={label}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-gray-700 text-white"
                        : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }`
                  }
                >
                  <svg className="w-5 h-5 shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    {icon}
                  </svg>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}