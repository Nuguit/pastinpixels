import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiLogin, apiRegistro } from "../api/auth";
import { useAuth } from "../App";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [modo, setModo] = useState("login");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", password2: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError("Por favor rellena todos los campos."); return; }
    if (modo === "registro") {
      if (!form.nombre) { setError("El nombre es obligatorio."); return; }
      if (form.password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
      if (form.password !== form.password2) { setError("Las contraseñas no coinciden."); return; }
    }
    setCargando(true);
    try {
      let data;
      if (modo === "login") {
        data = await apiLogin({ email: form.email, password: form.password });
      } else {
        data = await apiRegistro({ nombre_usuario: form.nombre, email: form.email, password: form.password });
      }
      login(data);
      navigate("/perfil");
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const toggleModo = () => {
    setModo((m) => m === "login" ? "registro" : "login");
    setForm({ nombre: "", email: "", password: "", password2: "" });
    setError("");
  };

  return (
    <div className="login-wrapper">


      <div className="login-deco">
        <div className="login-deco-grid" />
        <div className="login-deco-glow" />
        <div className="login-deco-content">
          <div className="login-deco-label">Past in Pixels</div>
          <blockquote className="login-deco-quote">
            "El arte es la historia contada por quienes la vivieron."
          </blockquote>
          <div className="login-deco-line" />
          <div className="login-deco-icons">
            {["🎨", "⚡", "🗺️"].map((emoji, i) => (
              <div key={i} className="login-deco-icon">{emoji}</div>
            ))}
          </div>
        </div>
      </div>


      <div className="login-form-panel">

        <button className="login-back-btn" onClick={() => navigate("/")}>
          ← Volver
        </button>

        <div className="login-logo">
          <div className="login-logo-emoji">🗺</div>
          <div className="login-logo-text">Past in Pixels</div>
        </div>


        <div className="login-toggle">
          {["login", "registro"].map((m) => (
            <button
              key={m}
              className={`login-toggle-btn${modo === m ? " activo" : ""}`}
              onClick={() => {
                setModo(m);
                setForm({ nombre: "", email: "", password: "", password2: "" });
                setError("");
              }}
            >
              {m === "login" ? "Entrar" : "Registrarse"}
            </button>
          ))}
        </div>


        <div className="login-fields">

          {modo === "registro" && (
            <div>
              <label className="login-label">Nombre</label>
              <input
                className="login-input"
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Tu nombre"
              />
            </div>
          )}

          <div>
            <label className="login-label">Email</label>
            <input
              className="login-input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="login-label">Contraseña</label>
            <input
              className="login-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
            />
          </div>

          {modo === "registro" && (
            <div>
              <label className="login-label">Repetir contraseña</label>
              <input
                className="login-input"
                type="password"
                name="password2"
                value={form.password2}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button
            className="login-submit-btn"
            onClick={handleSubmit}
            disabled={cargando}
          >
            {cargando ? "⏳ Cargando..." : modo === "login" ? "Entrar →" : "Crear cuenta →"}
          </button>

          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">o</span>
            <div className="login-divider-line" />
          </div>

          <button className="login-guest-btn" onClick={() => navigate("/map")}>
            Explorar sin cuenta
          </button>
        </div>

        <p className="login-footer">
          {modo === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
          <button className="login-footer-link" onClick={toggleModo}>
            {modo === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}
