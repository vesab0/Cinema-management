import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import RegisterForms from "./RegisterForms";
import { getAccessToken, getUser, logout } from "../auth";
import { API_BASE_URL as _API_BASE } from "../api";

export default function Navbar() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userName, setUserName] = useState<string | null>(() => {
        const user = getUser();
        return user ? `${user.firstName} ${user.lastName}`.trim() || user.email : null;
    });
    const [isAdminUser, setIsAdminUser] = useState(() => {
        const user = getUser();
        return !!user?.roles.map(r => r.toLowerCase()).includes('admin');
    });
    const [avatarSrc, setAvatarSrc] = useState<string | null>(() => {
        const user = getUser();
        return user?.avatarPath ?? null;
    });
    const navigate = useNavigate();

    // listen for global user change events so navbar updates without full refresh
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as any;
            if (!detail) {
                setUserName(null);
                setIsAdminUser(false);
                setAvatarSrc(null);
                return;
            }
            setUserName(`${detail.firstName} ${detail.lastName}`.trim() || detail.email || null);
            setIsAdminUser(detail.roles?.map((r: string) => r.toLowerCase()).includes('admin'));
            setAvatarSrc(detail.avatarPath ?? null);
        };
        window.addEventListener('auth:user-changed', handler as EventListener);
        return () => window.removeEventListener('auth:user-changed', handler as EventListener);
    }, []);

    const authToken = getAccessToken();
    const isLoggedIn = !!authToken;

    const handleLoginSuccess = () => {
        setIsModalOpen(false);
        const user = getUser();
        if (user) {
            setUserName(`${user.firstName} ${user.lastName}`.trim() || user.email);
            setIsAdminUser(user.roles.map(r => r.toLowerCase()).includes('admin'));
        }
    };

    const handleLogout = async () => {
        await logout();
        setUserName(null);
        setIsAdminUser(false);
        navigate("/");
    };

    return (
        <>
            <nav className="relative bg-wine p-4 flex items-center">
                <div className="flex-1 flex items-center">
                    {isAdminUser && (
                        <Link to="/dashboard" className="text-sm font-semibold text-gold hover:text-gold/70 transition-colors">
                            Dashboard
                        </Link>
                    )}
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="h-10" />
                        <span className="text-xl font-bold text-gold">Twin Peaks</span>
                    </Link>
                </div>

                <div className="ml-auto flex items-center gap-4">
                    {isLoggedIn ? (
                        <>
                            {(() => {
                                const raw = avatarSrc ?? getUser()?.avatarPath;
                                if (!raw) return (<div onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm text-white/80 cursor-pointer">A</div>);
                                const src = raw.startsWith('http') ? raw : `${_API_BASE}${raw}`;
                                return (<img src={src} alt="Avatar" onClick={() => navigate('/profile')} className="h-8 w-8 rounded-full object-cover cursor-pointer" />);
                            })()}
                            <span className="text-white font-medium text-sm">
                                {userName ?? "User"}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="text-white/60 text-sm underline hover:text-white transition-colors"
                            >
                                Logout
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-white underline hover:text-white/80 text-sm"
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