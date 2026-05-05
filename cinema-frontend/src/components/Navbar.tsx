import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import RegisterForms from "./RegisterForms";

export default function Navbar() {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const openRegisterModal = (event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setIsRegisterOpen(true);
    };

    const closeRegisterModal = () => setIsRegisterOpen(false);

    return (
        <>
            <nav className="relative bg-wine p-4 flex items-center">
                <div className="flex-1" />
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="h-10" />
                        <span className="text-xl font-bold text-gold">Twin Peaks</span>
                    </Link>
                </div>
                <button
                    onClick={() => setIsRegisterOpen(true)}
                    className="ml-auto text-white underline hover:text-white/80"
                >
                    Register
                </button>
            </nav>
            {isRegisterOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="relative w-full max-w-md">
                        <button
                            type="button"
                            onClick={closeRegisterModal}
                            className="absolute -top-3 -right-3 h-8 w-8 text-white font-bold"
                        >
                            ×
                        </button>
                        <RegisterForms />
                    </div>
                </div>
            )}
        </>
    );
}