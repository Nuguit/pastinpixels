import pool from "../config/db.js";

export default async function adminAuth(req, res, next) {
  try {
    const [rows] = await pool.query(
      "SELECT rol FROM usuarios WHERE id_usuario = ?",
      [req.usuario.id]
    );
    if (rows.length === 0 || rows[0].rol !== "superadmin") {
      return res.status(403).json({ error: "Acceso denegado: se requiere rol superadmin" });
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
