import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import {
  apiGetMe, apiUpdateMe, apiDeleteMe,
  apiGetRecorridos, apiCrearRecorrido,
  apiUpdateRecorrido, apiDeleteRecorrido,
  apiLogout,
} from "../api/auth";

// Subcomponente: Modal crear/editar recorrido 
function ModalRecorrido({ inicial, onGuardar, onCerrar, cargando }) {
  const [nombre, setNombre] = useState(inicial?.nombre || "");
  const [descripcion, setDescripcion] = useState(inicial?.descripcion || "");

  return (
    <div className="perfil-modal-overlay" onClick={onCerrar}>
      <div className="perfil-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="perfil-modal-title">
          {inicial ? "Editar recorrido" : "Nuevo recorrido"}
        </h3>

        <label className="perfil-field-label">Nombre</label>
        <input
          className="perfil-field-input"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del recorrido"
          autoFocus
        />

        <label className="perfil-field-label">Descripción</label>
        <textarea
          className="perfil-field-input perfil-field-textarea"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción opcional..."
          rows={3}
        />

        <div className="perfil-modal-actions">
          <button className="perfil-btn-cancel" onClick={onCerrar}>Cancelar</button>
          <button
            className="perfil-btn-primary"
            onClick={() => onGuardar({ nombre, descripcion })}
            disabled={!nombre.trim() || cargando}
          >
            {cargando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Subcomponente: Modal editar perfil 
function ModalEditarPerfil({ usuario, onGuardar, onCerrar, cargando }) {
  const [nombre_usuario, setNombre] = useState(usuario.nombre_usuario || "");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");

  const handleGuardar = () => {
    if (!nombre_usuario.trim()) { setError("El nombre es obligatorio"); return; }
    if (password && password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    if (password && password !== password2) { setError("Las contraseñas no coinciden"); return; }
    setError("");
    onGuardar({ nombre_usuario, password: password || undefined });
  };

  return (
    <div className="perfil-modal-overlay" onClick={onCerrar}>
      <div className="perfil-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="perfil-modal-title">Editar perfil</h3>

        <label className="perfil-field-label">Nombre de usuario</label>
        <input
          className="perfil-field-input"
          type="text"
          value={nombre_usuario}
          onChange={(e) => setNombre(e.target.value)}
        />

        <label className="perfil-field-label">Nueva contraseña <span className="perfil-field-optional">(dejar vacío para no cambiar)</span></label>
        <input
          className="perfil-field-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <label className="perfil-field-label">Repetir contraseña</label>
        <input
          className="perfil-field-input"
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="••••••••"
        />

        {error && <div className="perfil-error">{error}</div>}

        <div className="perfil-modal-actions">
          <button className="perfil-btn-cancel" onClick={onCerrar}>Cancelar</button>
          <button className="perfil-btn-primary" onClick={handleGuardar} disabled={cargando}>
            {cargando ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function Perfil() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [usuario, setUsuario]       = useState(null);
  const [recorridos, setRecorridos] = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState("");

  const [modalNuevo, setModalNuevo]       = useState(false);
  const [modalEditar, setModalEditar]     = useState(null); 
  const [modalPerfil, setModalPerfil]     = useState(false);
  const [guardando, setGuardando]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // id recorrido a eliminar

  const [tab, setTab] = useState("recorridos"); 

  useEffect(() => {
    Promise.all([apiGetMe(), apiGetRecorridos()])
      .then(([usr, recs]) => { setUsuario(usr); setRecorridos(recs); })
      .catch((err) => {
        if (err.message === "Sesión expirada") navigate("/login");
        else setError(err.message);
      })
      .finally(() => setCargando(false));
  }, []);

  const handleCrearRecorrido = async ({ nombre, descripcion }) => {
    setGuardando(true);
    try {
      const nuevo = await apiCrearRecorrido({ nombre, descripcion });
      setRecorridos((prev) => [{ ...nuevo, num_obras: 0, num_notas: 0 }, ...prev]);
      setModalNuevo(false);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const handleEditarRecorrido = async ({ nombre, descripcion }) => {
    setGuardando(true);
    try {
      await apiUpdateRecorrido(modalEditar.id_recorrido, { nombre, descripcion });
      setRecorridos((prev) =>
        prev.map((r) => r.id_recorrido === modalEditar.id_recorrido ? { ...r, nombre, descripcion } : r)
      );
      setModalEditar(null);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const handleEliminarRecorrido = async (id) => {
    try {
      await apiDeleteRecorrido(id);
      setRecorridos((prev) => prev.filter((r) => r.id_recorrido !== id));
      setConfirmDelete(null);
    } catch (err) { setError(err.message); }
  };

  const handleEditarPerfil = async ({ nombre_usuario, password }) => {
    setGuardando(true);
    try {
      await apiUpdateMe({ nombre_usuario, password });
      setUsuario((prev) => ({ ...prev, nombre_usuario }));
      setModalPerfil(false);
    } catch (err) { setError(err.message); }
    finally { setGuardando(false); }
  };

  const handleEliminarCuenta = async () => {
    if (!window.confirm("¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.")) return;
    try {
      await apiDeleteMe();
      navigate("/");
    } catch (err) { setError(err.message); }
  };

  const handleLogout = () => { logout(); navigate("/"); };

  if (cargando) return <div className="perfil-loading">⏳ Cargando perfil...</div>;

  const iniciales = usuario?.nombre_usuario?.slice(0, 2).toUpperCase() || "??";
  const diasDesdeRegistro = usuario?.fecha_registro
    ? Math.floor((Date.now() - new Date(usuario.fecha_registro)) / (1000 * 60 * 60 * 24))
    : 0;
  const totalObras = recorridos.reduce((acc, r) => acc + (r.num_obras || 0), 0);

  return (
    <div className="perfil-wrapper">


      <aside className="perfil-sidebar">
        <div className="perfil-sidebar-top">
          <div className="perfil-avatar">{iniciales}</div>
          <div className="perfil-sidebar-name">{usuario?.nombre_usuario}</div>
          <div className="perfil-sidebar-email">{usuario?.email}</div>
        </div>

        <nav className="perfil-nav">
          <button
            className={`perfil-nav-btn${tab === "recorridos" ? " activo" : ""}`}
            onClick={() => setTab("recorridos")}
          >
            🗺 Mis recorridos
          </button>
          <button
            className={`perfil-nav-btn${tab === "ajustes" ? " activo" : ""}`}
            onClick={() => setTab("ajustes")}
          >
            ⚙️ Ajustes
          </button>
          {usuario?.rol === "superadmin" && (
            <button
              className="perfil-nav-btn perfil-nav-btn-admin"
              onClick={() => navigate("/admin")}
            >
              ★ Panel de admin
            </button>
          )}
        </nav>

        <div className="perfil-sidebar-bottom">
          <button className="perfil-nav-btn perfil-nav-btn-mapa" onClick={() => navigate("/map")}>
            ← Volver al mapa
          </button>
          <button className="perfil-nav-btn perfil-nav-btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>


      <main className="perfil-main">

        {error && <div className="perfil-error perfil-error-top">{error} <button onClick={() => setError("")}>✕</button></div>}


        {tab === "recorridos" && (
          <div>

            <div className="perfil-stats">
              <div className="perfil-stat-card">
                <div className="perfil-stat-num">{recorridos.length}</div>
                <div className="perfil-stat-label">Recorridos</div>
              </div>
              <div className="perfil-stat-card">
                <div className="perfil-stat-num">{totalObras}</div>
                <div className="perfil-stat-label">Obras guardadas</div>
              </div>
              <div className="perfil-stat-card">
                <div className="perfil-stat-num">{diasDesdeRegistro}</div>
                <div className="perfil-stat-label">Días explorando</div>
              </div>
            </div>


            <div className="perfil-section-header">
              <h2 className="perfil-section-title">Mis recorridos</h2>
              <button className="perfil-btn-primary" onClick={() => setModalNuevo(true)}>
                + Nuevo recorrido
              </button>
            </div>


            {recorridos.length === 0 ? (
              <div className="perfil-empty">
                <div className="perfil-empty-icon">🗺</div>
                <p>Aún no tienes recorridos.</p>
                <button className="perfil-btn-primary" onClick={() => setModalNuevo(true)}>
                  Crear mi primer recorrido
                </button>
              </div>
            ) : (
              <div className="perfil-recorridos-grid">
                {recorridos.map((r) => (
                  <div key={r.id_recorrido} className="perfil-recorrido-card">
                    <div className="perfil-recorrido-card-body" onClick={() => navigate(`/recorrido/${r.id_recorrido}`)}>
                      <div className="perfil-recorrido-icon">🗺</div>
                      <div className="perfil-recorrido-nombre">{r.nombre}</div>
                      {r.descripcion && (
                        <div className="perfil-recorrido-desc">{r.descripcion}</div>
                      )}
                      <div className="perfil-recorrido-meta">
                        <span>{r.num_obras} obra{r.num_obras !== 1 ? "s" : ""}</span>
                        <span>{r.num_notas} nota{r.num_notas !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <div className="perfil-recorrido-actions">
                      <button
                        className="perfil-recorrido-btn-edit"
                        onClick={() => setModalEditar(r)}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        className="perfil-recorrido-btn-delete"
                        onClick={() => setConfirmDelete(r.id_recorrido)}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {tab === "ajustes" && (
          <div className="perfil-ajustes">
            <h2 className="perfil-section-title">Ajustes de cuenta</h2>

            <div className="perfil-ajustes-card">
              <div className="perfil-ajustes-row">
                <div>
                  <div className="perfil-ajustes-label">Nombre de usuario</div>
                  <div className="perfil-ajustes-value">{usuario?.nombre_usuario}</div>
                </div>
                <button className="perfil-btn-secondary" onClick={() => setModalPerfil(true)}>
                  Editar
                </button>
              </div>
              <div className="perfil-ajustes-divider" />
              <div className="perfil-ajustes-row">
                <div>
                  <div className="perfil-ajustes-label">Email</div>
                  <div className="perfil-ajustes-value">{usuario?.email}</div>
                </div>
              </div>
              <div className="perfil-ajustes-divider" />
              <div className="perfil-ajustes-row">
                <div>
                  <div className="perfil-ajustes-label">Miembro desde</div>
                  <div className="perfil-ajustes-value">
                    {usuario?.fecha_registro
                      ? new Date(usuario.fecha_registro).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="perfil-ajustes-danger">
              <h3 className="perfil-ajustes-danger-title">Zona de peligro</h3>
              <p className="perfil-ajustes-danger-desc">
                Eliminar tu cuenta borrará todos tus recorridos y notas de forma permanente.
              </p>
              <button className="perfil-btn-danger" onClick={handleEliminarCuenta}>
                Eliminar mi cuenta
              </button>
            </div>
          </div>
        )}
      </main>


      {modalNuevo && (
        <ModalRecorrido
          onGuardar={handleCrearRecorrido}
          onCerrar={() => setModalNuevo(false)}
          cargando={guardando}
        />
      )}
      {modalEditar && (
        <ModalRecorrido
          inicial={modalEditar}
          onGuardar={handleEditarRecorrido}
          onCerrar={() => setModalEditar(null)}
          cargando={guardando}
        />
      )}
      {modalPerfil && (
        <ModalEditarPerfil
          usuario={usuario}
          onGuardar={handleEditarPerfil}
          onCerrar={() => setModalPerfil(false)}
          cargando={guardando}
        />
      )}
      {confirmDelete && (
        <div className="perfil-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="perfil-modal perfil-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <h3 className="perfil-modal-title">¿Eliminar recorrido?</h3>
            <p className="perfil-modal-confirm-text">Esta acción no se puede deshacer.</p>
            <div className="perfil-modal-actions">
              <button className="perfil-btn-cancel" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="perfil-btn-danger" onClick={() => handleEliminarRecorrido(confirmDelete)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
