import { Link, useNavigate } from "react-router-dom";
import RegisterForms from "./RegisterForms";
import { logout } from "../auth";
import { API_BASE_URL as _API_BASE } from "../api";
import { useAuthStore } from "../store/authStore";
import { useState } from "react";

export default function Navbar() {
    const { user } = useAuthStore()
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const isLoggedIn = !!user
    const roles = user?.roles.map(r => r.toLowerCase()) ?? []
    const canSeeDashboard = roles.includes('admin') || roles.includes('staff')
    const userName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : null
    const avatarSrc = user?.avatarPath ?? null

    const handleLoginSuccess = () => {
        setIsModalOpen(false);
    };

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <>
            <nav className="relative bg-wine px-4 py-3 flex items-center">
                <div className="flex-1 flex items-center min-w-0">
                    {canSeeDashboard && (
                        <Link to="/dashboard" className="text-sm font-semibold text-gold hover:text-gold/70 transition-colors whitespace-nowrap">
                            Dashboard
                        </Link>
                    )}
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
                    <Link to="/" className="flex items-center gap-2 pointer-events-auto">
                        <img src="/logo.png" alt="Logo" className="h-8 sm:h-10" />
                        <span className="text-lg sm:text-xl font-bold text-gold">Twin Peaks</span>
                    </Link>
                </div>

                <div className="ml-auto flex items-center gap-2 sm:gap-4 min-w-0">
                    {isLoggedIn ? (
                        <>
                            <div
                                onClick={() => navigate('/profile')}
                                className="flex items-center gap-2 cursor-pointer group min-w-0">
                                {(() => {
                                    if (!avatarSrc) return (
                                        <div className="h-8 w-8 shrink-0 rounded-full bg-gray-700 flex items-center justify-center text-sm text-white/80 group-hover:ring-2 group-hover:ring-gold/50 transition-all">
                                            A
                                        </div>
                                    );
                                    const src = avatarSrc.startsWith('http') ? avatarSrc : `${_API_BASE}${avatarSrc}`;
                                    return (
                                        <img
                                            src={src}
                                            alt="Avatar"
                                            className="h-8 w-8 shrink-0 rounded-full object-cover group-hover:ring-2 group-hover:ring-gold/50 transition-all"
                                        />
                                    );
                                })()}
                                <span className="hidden sm:block text-white font-medium text-sm group-hover:text-gold transition-colors truncate max-w-[120px]">
                                    {userName ?? "User"}
                                </span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-white/60 text-sm underline hover:text-white transition-colors whitespace-nowrap"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-white underline hover:text-white/80 text-sm whitespace-nowrap"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </nav>

            {isModalOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
                >
                    <div className="relative w-full max-w-md">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-wine border border-gold/30 text-white font-bold flex items-center justify-center hover:bg-wine/80 z-10"
                        >
                            ×
                        </button>
                        <RegisterForms onLoginSuccess={handleLoginSuccess} />
                    </div>
                </div>
            )}
        </>
    );
}