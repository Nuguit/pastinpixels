const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

function getToken() {
  return localStorage.getItem("pip_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function apiRegistro({ nombre_usuario, email, password }) {
  const res = await fetch(`${API}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre_usuario, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error en el registro");
  localStorage.setItem("pip_token", data.token);
  return data;
}

export async function apiLogin({ email, password }) {
  const res = await fetch(`${API}/usuarios/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Credenciales incorrectas");
  localStorage.setItem("pip_token", data.token);
  return data;
}

export function apiLogout() {
  localStorage.removeItem("pip_token");
}

export async function apiGetMe() {
  const res = await fetch(`${API}/usuarios/me`, { headers: authHeaders() });
  if (res.status === 401) { apiLogout(); throw new Error("Sesión expirada"); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiUpdateMe({ nombre_usuario, password }) {
  const res = await fetch(`${API}/usuarios/me`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ nombre_usuario, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiDeleteMe() {
  const res = await fetch(`${API}/usuarios/me`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  apiLogout();
  return data;
}

export async function apiGetRecorridos() {
  const res = await fetch(`${API}/recorridos`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiCrearRecorrido({ nombre, descripcion }) {
  const res = await fetch(`${API}/recorridos`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ nombre, descripcion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiUpdateRecorrido(id, { nombre, descripcion }) {
  const res = await fetch(`${API}/recorridos/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ nombre, descripcion }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiDeleteRecorrido(id) {
  const res = await fetch(`${API}/recorridos/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

// ─── Admin API ───────────────────────────────────────────

export async function apiAdminGetStats() {
  const res = await fetch(`${API}/admin/stats`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiAdminGetUsuarios() {
  const res = await fetch(`${API}/admin/usuarios`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiAdminUpdateRol(id, rol) {
  const res = await fetch(`${API}/admin/usuarios/${id}/rol`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ rol }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}

export async function apiAdminDeleteUsuario(id) {
  const res = await fetch(`${API}/admin/usuarios/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data;
}
