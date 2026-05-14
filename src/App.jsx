import { Routes, Route } from "react-router-dom";
import { useState, createContext, useContext } from "react";
import Map from "./components/Map.jsx";
import Results from "./components/Results.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Perfil from "./pages/Perfil.jsx";
import DetalleRecorrido from "./pages/DetalleRecorrido.jsx";
import NotFound from "./pages/NotFound.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import SuperAdmin from "./pages/SuperAdmin.jsx";
import "./global.css";


export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export default function App() {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem("pip_usuario");
      return guardado ? JSON.parse(guardado) : null;
    } catch {
      return null;
    }
  });

  const login = (data) => {
    setUsuario(data.usuario);
    localStorage.setItem("pip_usuario", JSON.stringify(data.usuario));
    localStorage.setItem("pip_token", data.token);
  };

  const logout = () => {
    setUsuario(null);
    localStorage.removeItem("pip_usuario");
    localStorage.removeItem("pip_token");
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      <Routes>

        <Route path="/"        element={<Landing />} />
        <Route path="/map"     element={<Map />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/results" element={<Results />} />


        <Route path="/perfil" element={
          <PrivateRoute><Perfil /></PrivateRoute>
        } />
        <Route path="/recorrido/:id" element={
          <PrivateRoute><DetalleRecorrido /></PrivateRoute>
        } />


        <Route path="/admin" element={
          <AdminRoute><SuperAdmin /></AdminRoute>
        } />


        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthContext.Provider>
  );
}
