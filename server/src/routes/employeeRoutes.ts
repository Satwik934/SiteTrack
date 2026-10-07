import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorizeMiddleware";
import { createEmployee, listEmployees, updateEmployee } from "../controllers/employeeController";

const router = Router();
router.use(authenticate, authorize("owner", "manager"));
router.get("/", listEmployees);
router.post("/", createEmployee);
router.patch("/:employeeId", updateEmployee);
export default router;
