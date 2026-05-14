import { Router } from "express";
import auth from "../middleware/auth.js";
import { registro, login, getMe, updateMe, deleteMe } from "../controllers/usuariosController.js";

const router = Router();

router.post("/",        registro);   // POST /api/usuarios       — registro
router.post("/login",   login);      // POST /api/usuarios/login  — login
router.get("/me",       auth, getMe);      // GET  /api/usuarios/me    — perfil
router.put("/me",       auth, updateMe);   // PUT  /api/usuarios/me    — editar
router.delete("/me",    auth, deleteMe);   // DELETE /api/usuarios/me  — eliminar cuenta

export default router;
