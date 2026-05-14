import pool from "../config/db.js";

// GET /api/recorridos — mis recorridos
export async function getMisRecorridos(req, res) {
  try {
    const [recorridos] = await pool.query(
      `SELECT r.*,
        COUNT(DISTINCT o.id) AS num_obras,
        COUNT(DISTINCT n.id_nota) AS num_notas
       FROM recorridos r
       LEFT JOIN obras_recorridos o ON o.id_recorrido = r.id_recorrido
       LEFT JOIN notas n ON n.id_recorrido = r.id_recorrido
       WHERE r.id_usuario = ?
       GROUP BY r.id_recorrido
       ORDER BY r.fecha_creacion DESC`,
      [req.usuario.id]
    );
    res.json(recorridos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// POST /api/recorridos — crear recorrido
export async function crearRecorrido(req, res) {
  const { nombre, descripcion } = req.body;
  if (!nombre) return res.status(400).json({ error: "El nombre es obligatorio" });
  try {
    const [result] = await pool.query(
      "INSERT INTO recorridos (id_usuario, nombre, descripcion) VALUES (?, ?, ?)",
      [req.usuario.id, nombre, descripcion || ""]
    );
    res.status(201).json({ id_recorrido: result.insertId, nombre, descripcion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// GET /api/recorridos/:id — detalle de un recorrido
export async function getRecorrido(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT * FROM recorridos WHERE id_recorrido = ? AND id_usuario = ?",
      [id, req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Recorrido no encontrado" });

    const [obras] = await pool.query(
      "SELECT * FROM obras_recorridos WHERE id_recorrido = ? ORDER BY orden",
      [id]
    );
    const [notas] = await pool.query(
      "SELECT * FROM notas WHERE id_recorrido = ? ORDER BY fecha_creacion DESC",
      [id]
    );
    const [ubicaciones] = await pool.query(
      "SELECT * FROM ubicaciones_recorridos WHERE id_recorrido = ? ORDER BY orden",
      [id]
    );

    res.json({ ...rows[0], obras, notas, ubicaciones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// PUT /api/recorridos/:id — editar recorrido
export async function updateRecorrido(req, res) {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT id_recorrido FROM recorridos WHERE id_recorrido = ? AND id_usuario = ?",
      [id, req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Recorrido no encontrado" });

    await pool.query(
      "UPDATE recorridos SET nombre = ?, descripcion = ? WHERE id_recorrido = ?",
      [nombre, descripcion, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// DELETE /api/recorridos/:id
export async function deleteRecorrido(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT id_recorrido FROM recorridos WHERE id_recorrido = ? AND id_usuario = ?",
      [id, req.usuario.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Recorrido no encontrado" });

    await pool.query("DELETE FROM recorridos WHERE id_recorrido = ?", [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// POST /api/recorridos/:id/obras — añadir obra
export async function addObra(req, res) {
  const { id } = req.params;
  const { id_obra_api, fuente_api, titulo, artista, anio, imagen_url, url_externo, orden } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO obras_recorridos
        (id_recorrido, id_obra_api, fuente_api, titulo, artista, anio, imagen_url, url_externo, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, id_obra_api, fuente_api, titulo, artista, anio, imagen_url, url_externo, orden || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// DELETE /api/recorridos/:id/obras/:id_obra
export async function removeObra(req, res) {
  const { id, id_obra } = req.params;
  try {
    await pool.query("DELETE FROM obras_recorridos WHERE id = ? AND id_recorrido = ?", [id_obra, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// POST /api/recorridos/:id/notas — añadir nota
export async function addNota(req, res) {
  const { id } = req.params;
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "El texto es obligatorio" });
  try {
    const [result] = await pool.query(
      "INSERT INTO notas (id_usuario, id_recorrido, texto) VALUES (?, ?, ?)",
      [req.usuario.id, id, texto]
    );
    res.status(201).json({ id_nota: result.insertId, texto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// PUT /api/recorridos/:id/notas/:id_nota
export async function updateNota(req, res) {
  const { id_nota } = req.params;
  const { texto } = req.body;
  try {
    await pool.query(
      "UPDATE notas SET texto = ? WHERE id_nota = ? AND id_usuario = ?",
      [texto, id_nota, req.usuario.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// DELETE /api/recorridos/:id/notas/:id_nota
export async function deleteNota(req, res) {
  const { id_nota } = req.params;
  try {
    await pool.query(
      "DELETE FROM notas WHERE id_nota = ? AND id_usuario = ?",
      [id_nota, req.usuario.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}
