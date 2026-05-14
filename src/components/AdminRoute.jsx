import { Navigate } from "react-router-dom";
import { useAuth } from "../App.jsx";

export default function AdminRoute({ children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== "superadmin") return <Navigate to="/perfil" replace />;
  return children;
}
