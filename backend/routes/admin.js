import { Router } from "express";
import auth from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import { getUsuarios, updateRol, deleteUsuario, getStats } from "../controllers/adminController.js";

const router = Router();

router.use(auth, adminAuth);

router.get("/stats", getStats);
router.get("/usuarios", getUsuarios);
router.put("/usuarios/:id/rol", updateRol);
router.delete("/usuarios/:id", deleteUsuario);

export default router;
