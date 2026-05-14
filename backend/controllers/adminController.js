import pool from "../config/db.js";

// GET /api/admin/usuarios 
export async function getUsuarios(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre_usuario, u.email, u.rol, u.fecha_registro,
        COUNT(DISTINCT r.id_recorrido) AS total_recorridos
      FROM usuarios u
      LEFT JOIN recorridos r ON r.id_usuario = u.id_usuario
      GROUP BY u.id_usuario
      ORDER BY u.fecha_registro DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// PUT /api/admin/usuarios/:id/rol — cambiar rol de un usuario
export async function updateRol(req, res) {
  const { id } = req.params;
  const { rol } = req.body;

  if (!["usuario", "superadmin"].includes(rol)) {
    return res.status(400).json({ error: "Rol no válido" });
  }
  if (parseInt(id) === req.usuario.id && rol !== "superadmin") {
    return res.status(400).json({ error: "No puedes quitarte el rol de superadmin a ti mismo" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE usuarios SET rol = ? WHERE id_usuario = ?",
      [rol, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true, rol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// DELETE /api/admin/usuarios/:id 
export async function deleteUsuario(req, res) {
  const { id } = req.params;

  if (parseInt(id) === req.usuario.id) {
    return res.status(400).json({ error: "No puedes eliminar tu propia cuenta desde el panel de admin" });
  }

  try {
    const [result] = await pool.query("DELETE FROM usuarios WHERE id_usuario = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// GET /api/admin/stats — estadísticas generales
export async function getStats(req, res) {
  try {
    const [[{ total_usuarios }]] = await pool.query("SELECT COUNT(*) AS total_usuarios FROM usuarios");
    const [[{ total_superadmins }]] = await pool.query("SELECT COUNT(*) AS total_superadmins FROM usuarios WHERE rol = 'superadmin'");
    const [[{ total_recorridos }]] = await pool.query("SELECT COUNT(*) AS total_recorridos FROM recorridos");
    const [[{ total_obras }]] = await pool.query("SELECT COUNT(*) AS total_obras FROM obras_recorridos");
    res.json({ total_usuarios, total_superadmins, total_recorridos, total_obras });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
