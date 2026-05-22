import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminAuthenticated, bootstrapSession } from "./auth";

export default function AdminRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'ok' | 'denied'>(
    () => isAdminAuthenticated() ? 'ok' : 'loading'
  );

  useEffect(() => {
    if (status !== 'loading') return;
    bootstrapSession().then(user => {
      const roles = user?.roles.map(r => r.toLowerCase()) ?? [];
      setStatus(roles.includes('admin') ? 'ok' : 'denied');
    });
  }, []);

  if (status === 'loading') return null;
  if (status === 'denied') return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
