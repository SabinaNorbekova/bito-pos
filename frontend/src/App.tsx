import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactElement } from "react";
import { AuthProvider } from "./api/AuthContext";
import { useAuth } from "./api/useAuth";
import LoginPage from "./pages/LoginPage";
import PosPage from "./pages/PosPage";
import AdminReportPage from "./pages/AdminReportPage";

function ProtectedRoute({
  children,
  role,
}: {
  children: ReactElement;
  role?: "admin" | "cashier";
}) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return <Navigate to={user.role === "admin" ? "/admin" : "/pos"} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={user.role === "admin" ? "/admin" : "/pos"} />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <PosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminReportPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
