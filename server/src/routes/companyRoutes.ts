import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { getCompany } from "../controllers/companyController";

const router = Router();
router.get("/", authenticate, getCompany);
export default router;
