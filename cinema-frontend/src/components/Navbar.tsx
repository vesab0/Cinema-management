import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import RegisterForms from "./RegisterForms";
import { getAccessToken, getUser, fetchCurrentUser, logout } from "../auth";

export default function Navbar() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(getAccessToken());
    const [userName, setUserName] = useState<string | null>(null);
    const [isAdminUser, setIsAdminUser] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            const token = getAccessToken();
            if (token) {
                const user = await fetchCurrentUser();
                if (user) {
                    setAuthToken(token);
                    setUserName(`${user.firstName} ${user.lastName}`.trim() || user.email);
                    setIsAdminUser(user.roles.map(r => r.toLowerCase()).includes('admin'));
                } else {
                    setAuthToken(null);
                    setUserName(null);
                    setIsAdminUser(false);
                }
            }
        };
        checkAuth();
    }, []);

    const isLoggedIn = !!authToken;

    const handleLoginSuccess = () => {
        setIsModalOpen(false);
        const token = getAccessToken();
        setAuthToken(token);
        const user = getUser();
        if (user) {
            setUserName(`${user.firstName} ${user.lastName}`.trim() || user.email);
            setIsAdminUser(user.roles.map(r => r.toLowerCase()).includes('admin'));
        }
    };

    const handleLogout = async () => {
        await logout();
        setAuthToken(null);
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