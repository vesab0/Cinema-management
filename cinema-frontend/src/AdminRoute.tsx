import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

export default function AdminRoute() {
  const location = useLocation();
  const { user, isBootstrapped } = useAuthStore()

  if (!isBootstrapped) return null;

  const isAdmin = !!user?.roles.map(r => r.toLowerCase()).includes('admin')
  if (!isAdmin) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}
