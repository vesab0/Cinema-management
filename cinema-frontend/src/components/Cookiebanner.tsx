import { useState, useEffect } from "react";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookieConsent");
    if (!accepted) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookieConsent", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
  <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-6 bg-stage border-t border-gold/20 px-8 py-4 shadow-[0_-4px_30px_rgba(0,0,0,0.4)]">
    <p className="text-white/70 text-sm leading-relaxed max-w-2xl">
      We use essential cookies to keep you signed in. These are required
      for the site to function and cannot be disabled.
    </p>
    <button onClick={handleAccept} className="text-sm font-semibold px-5 py-2 bg-gold text-stage rounded hover:bg-gold/90 transition-colors shrink-0">
      Accept & Continue
    </button>
  </div>
);
}