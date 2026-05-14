import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  apiAdminGetStats,
  apiAdminGetUsuarios,
  apiAdminUpdateRol,
  apiAdminDeleteUsuario,
} from "../api/auth";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const [procesando, setProcesando] = useState(null);

  useEffect(() => {
    Promise.all([apiAdminGetStats(), apiAdminGetUsuarios()])
      .then(([s, u]) => { setStats(s); setUsuarios(u); })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const handleCambiarRol = async (usuario) => {
    const nuevoRol = usuario.rol === "superadmin" ? "usuario" : "superadmin";
    setProcesando(usuario.id_usuario);
    try {
      await apiAdminUpdateRol(usuario.id_usuario, nuevoRol);
      setUsuarios((prev) =>
        prev.map((u) => u.id_usuario === usuario.id_usuario ? { ...u, rol: nuevoRol } : u)
      );
      setStats((prev) => ({
        ...prev,
        total_superadmins: nuevoRol === "superadmin"
          ? prev.total_superadmins + 1
          : prev.total_superadmins - 1,
      }));
    } catch (err) { setError(err.message); }
    finally { setProcesando(null); }
  };

  const handleEliminar = async (id) => {
    setProcesando(id);
    try {
      await apiAdminDeleteUsuario(id);
      const eliminado = usuarios.find((u) => u.id_usuario === id);
      setUsuarios((prev) => prev.filter((u) => u.id_usuario !== id));
      setStats((prev) => ({
        ...prev,
        total_usuarios: prev.total_usuarios - 1,
        total_superadmins: eliminado?.rol === "superadmin"
          ? prev.total_superadmins - 1
          : prev.total_superadmins,
      }));
      setConfirmEliminar(null);
    } catch (err) { setError(err.message); }
    finally { setProcesando(null); }
  };

  const usuariosFiltrados = usuarios.filter((u) =>
    u.nombre_usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (cargando) return <div className="admin-loading">Cargando panel...</div>;

  return (
    <div className="admin-wrapper">

      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">★</div>
          <div>
            <div className="admin-brand-title">Super Admin</div>
            <div className="admin-brand-sub">Past in Pixels</div>
          </div>
        </div>

        <nav className="admin-nav">
          <div className="admin-nav-item activo">Panel de usuarios</div>
        </nav>

        <div className="admin-sidebar-bottom">
          <button className="admin-nav-btn" onClick={() => navigate("/perfil")}>
            ← Mi perfil
          </button>
          <button className="admin-nav-btn admin-nav-btn-logout" onClick={() => { logout(); navigate("/"); }}>
            Cerrar sesión
          </button>
        </div>
      </aside>


      <main className="admin-main">
        <div className="admin-header">
          <h1 className="admin-title">Panel de administración</h1>
        </div>

        {error && (
          <div className="admin-error">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}


        {stats && (
          <div className="admin-stats">
            <div className="admin-stat-card">
              <div className="admin-stat-num">{stats.total_usuarios}</div>
              <div className="admin-stat-label">Usuarios totales</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-num">{stats.total_superadmins}</div>
              <div className="admin-stat-label">Super admins</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-num">{stats.total_recorridos}</div>
              <div className="admin-stat-label">Recorridos</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-num">{stats.total_obras}</div>
              <div className="admin-stat-label">Obras guardadas</div>
            </div>
          </div>
        )}


        <div className="admin-toolbar">
          <input
            className="admin-search"
            type="text"
            placeholder="Buscar por nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <span className="admin-count">{usuariosFiltrados.length} usuario{usuariosFiltrados.length !== 1 ? "s" : ""}</span>
        </div>


        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Recorridos</th>
                <th>Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-table-empty">No se encontraron usuarios</td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => (
                  <tr key={u.id_usuario} className={u.rol === "superadmin" ? "admin-row-admin" : ""}>
                    <td className="admin-td-id">#{u.id_usuario}</td>
                    <td className="admin-td-nombre">
                      <div className="admin-user-avatar">{u.nombre_usuario.slice(0, 2).toUpperCase()}</div>
                      {u.nombre_usuario}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.rol === "superadmin" ? "admin-badge-admin" : "admin-badge-user"}`}>
                        {u.rol === "superadmin" ? "★ Super admin" : "Usuario"}
                      </span>
                    </td>
                    <td className="admin-td-center">{u.total_recorridos}</td>
                    <td className="admin-td-fecha">
                      {new Date(u.fecha_registro).toLocaleDateString("es-ES", {
                        year: "numeric", month: "short", day: "numeric"
                      })}
                    </td>
                    <td className="admin-td-actions">
                      <button
                        className={`admin-btn-rol ${u.rol === "superadmin" ? "admin-btn-degradar" : "admin-btn-promover"}`}
                        onClick={() => handleCambiarRol(u)}
                        disabled={procesando === u.id_usuario}
                        title={u.rol === "superadmin" ? "Quitar rol admin" : "Promover a admin"}
                      >
                        {procesando === u.id_usuario ? "..." : u.rol === "superadmin" ? "Degradar" : "Promover"}
                      </button>
                      <button
                        className="admin-btn-delete"
                        onClick={() => setConfirmEliminar(u)}
                        disabled={procesando === u.id_usuario}
                        title="Eliminar usuario"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>


      {confirmEliminar && (
        <div className="perfil-modal-overlay" onClick={() => setConfirmEliminar(null)}>
          <div className="perfil-modal perfil-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h3 className="perfil-modal-title">¿Eliminar usuario?</h3>
            <p className="perfil-modal-confirm-text">
              Se eliminará la cuenta de <strong>{confirmEliminar.nombre_usuario}</strong> y todos sus datos de forma permanente.
            </p>
            <div className="perfil-modal-actions">
              <button className="perfil-btn-cancel" onClick={() => setConfirmEliminar(null)}>Cancelar</button>
              <button
                className="perfil-btn-danger"
                onClick={() => handleEliminar(confirmEliminar.id_usuario)}
                disabled={procesando === confirmEliminar.id_usuario}
              >
                {procesando === confirmEliminar.id_usuario ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
