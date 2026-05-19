import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RegisterForms from "./RegisterForms";
import { getAccessToken, isAdminToken } from "../auth";

function getUserName(token: string): string | null {
    try {
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        const first = payload["given_name"] ?? payload["firstName"] ?? "";
        const last = payload["family_name"] ?? payload["lastName"] ?? "";
        const full = `${first} ${last}`.trim();
        return full || payload["email"] || null;
    } catch {
        return null;
    }
}

export default function Navbar() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [authToken, setAuthToken] = useState<string | null>(getAccessToken);
    const navigate = useNavigate();

    const isLoggedIn = !!authToken;
    const isAdmin = authToken ? isAdminToken(authToken) : false;
    const userName = authToken ? getUserName(authToken) : null;

    const handleLoginSuccess = () => {
        setIsModalOpen(false);
        setAuthToken(getAccessToken());
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setAuthToken(null);
        navigate("/");
    };

    return (
        <>
            <nav className="relative bg-wine p-4 flex items-center">

                {/* Left side - Dashboard for admins */}
                <div className="flex-1 flex items-center">
                    {isAdmin && (
                        <Link to="/dashboard" className="text-sm font-semibold text-gold hover:text-gold/70 transition-colors">
                            Dashboard
                        </Link>
                    )}
                </div>

                {/* Centered logo */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="h-10" />
                        <span className="text-xl font-bold text-gold">Twin Peaks</span>
                    </Link>
                </div>

                {/* Right side - auth */}
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