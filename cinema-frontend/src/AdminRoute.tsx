import { Navigate, Outlet, useLocation } from "react-router-dom";
import { isAdminAuthenticated } from "./auth";

export default function AdminRoute() {
  const location = useLocation();

  if (!isAdminAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
