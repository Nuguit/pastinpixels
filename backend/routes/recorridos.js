import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  getMisRecorridos, crearRecorrido,
  getRecorrido, updateRecorrido, deleteRecorrido,
  addObra, removeObra,
  addNota, updateNota, deleteNota,
} from "../controllers/recorridosController.js";

const router = Router();

// Todos los endpoints requieren autenticación
router.use(auth);

router.get("/",              getMisRecorridos);   // GET  /api/recorridos
router.post("/",             crearRecorrido);     // POST /api/recorridos
router.get("/:id",           getRecorrido);       // GET  /api/recorridos/:id
router.put("/:id",           updateRecorrido);    // PUT  /api/recorridos/:id
router.delete("/:id",        deleteRecorrido);    // DELETE /api/recorridos/:id

router.post("/:id/obras",              addObra);    // POST /api/recorridos/:id/obras
router.delete("/:id/obras/:id_obra",   removeObra); // DELETE /api/recorridos/:id/obras/:id_obra

router.post("/:id/notas",              addNota);    // POST /api/recorridos/:id/notas
router.put("/:id/notas/:id_nota",      updateNota); // PUT  /api/recorridos/:id/notas/:id_nota
router.delete("/:id/notas/:id_nota",   deleteNota); // DELETE /api/recorridos/:id/notas/:id_nota

export default router;
