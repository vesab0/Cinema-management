import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

export default function AdminRoute() {
  const location = useLocation();
  const { user, isBootstrapped } = useAuthStore()

  if (!isBootstrapped) return null;

  const isAdminOrStaff = user?.roles
    .map(r => r.toLowerCase())
    .some(r => r === 'admin' || r === 'staff') ?? false

  if (!isAdminOrStaff) return <Navigate to="/" replace state={{ from: location.pathname }} />;

  return <Outlet />;
}