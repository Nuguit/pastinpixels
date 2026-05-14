import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// POST /api/usuarios — registro
export async function registro(req, res) {
  const { nombre_usuario, email, password } = req.body;
  if (!nombre_usuario || !email || !password)
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  if (password.length < 6)
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });

  try {
    const [existe] = await pool.query("SELECT id_usuario FROM usuarios WHERE email = ?", [email]);
    if (existe.length > 0)
      return res.status(409).json({ error: "Ya existe una cuenta con ese email" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO usuarios (nombre_usuario, email, password) VALUES (?, ?, ?)",
      [nombre_usuario, email, hash]
    );
    const token = jwt.sign(
      { id: result.insertId, nombre_usuario, email, rol: "usuario" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.status(201).json({ token, usuario: { id: result.insertId, nombre_usuario, email, rol: "usuario" } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// POST /api/usuarios/login
export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email y contraseña requeridos" });

  try {
    const [rows] = await pool.query("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(401).json({ error: "Credenciales incorrectas" });

    const usuario = rows[0];
    const ok = await bcrypt.compare(password, usuario.password);
    if (!ok) return res.status(401).json({ error: "Credenciales incorrectas" });

    const token = jwt.sign(
      { id: usuario.id_usuario, nombre_usuario: usuario.nombre_usuario, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    res.json({ token, usuario: { id: usuario.id_usuario, nombre_usuario: usuario.nombre_usuario, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// GET /api/usuarios/me — perfil propio
export async function getMe(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id_usuario, nombre_usuario, email, rol, fecha_registro FROM usuarios WHERE id_usuario = ?",
      [req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// PUT /api/usuarios/me — editar perfil
export async function updateMe(req, res) {
  const { nombre_usuario, password } = req.body;
  try {
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE usuarios SET nombre_usuario = ?, password = ? WHERE id_usuario = ?",
        [nombre_usuario, hash, req.usuario.id]
      );
    } else {
      await pool.query(
        "UPDATE usuarios SET nombre_usuario = ? WHERE id_usuario = ?",
        [nombre_usuario, req.usuario.id]
      );
    }
    res.json({ ok: true, nombre_usuario });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// DELETE /api/usuarios/me
export async function deleteMe(req, res) {
  try {
    await pool.query("DELETE FROM usuarios WHERE id_usuario = ?", [req.usuario.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
